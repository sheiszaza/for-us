import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { addDoc, collection, doc, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Heart, SendHorizonal } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../firebaseData';
import { useRole } from '../context/RoleContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { formatTime } from '../lib/date';
import { getRoleLabel } from '../lib/roles';
import type { Message } from '../types';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Page } from '../components/Page';

export function Messages() {
  const { role } = useRole();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const constraints = useMemo(() => [orderBy('createdAt', 'asc')], []);
  const { data: messages, loading, error } = useRealtimeCollection<Message>('messages', constraints);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!role || messages.length === 0) {
      return;
    }

    const seenField = role === 'me' ? 'seenByMe' : 'seenByHer';
    const unseen = messages.filter((message) => message.from !== role && !message[seenField]);

    unseen.forEach((message) => {
      void updateDoc(doc(db, 'messages', message.id), { [seenField]: true });
    });
  }, [messages, role]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!role || !text.trim()) {
        return;
      }

      setSending(true);

      try {
        await addDoc(collection(db, 'messages'), {
          text: text.trim(),
          from: role,
          createdAt: serverTimestamp(),
          seenByMe: role === 'me',
          seenByHer: role === 'her',
        });
        setText('');
      } catch (sendError) {
        toast.error(sendError instanceof Error ? sendError.message : 'Message could not be sent.');
      } finally {
        setSending(false);
      }
    },
    [role, text],
  );

  return (
    <Page eyebrow="Realtime chat" title="Messages" description="Send the thoughts that should not wait.">
      <section className="glass-card flex h-[calc(100vh-13rem)] min-h-[32rem] flex-col overflow-hidden rounded-[2rem]">
        <div className="border-b border-white/70 px-5 py-4">
          <p className="text-sm font-bold text-rose-950">Private room</p>
          <p className="text-xs text-rose-600/70">{role ? `Writing as ${getRoleLabel(role)}` : 'Unlocked for two hearts'}</p>
        </div>

        <div className="soft-scrollbar flex-1 overflow-y-auto px-4 py-5">
          {loading ? (
            <div className="grid gap-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className={`h-14 w-2/3 animate-pulse rounded-[1.5rem] bg-rose-100 ${item % 2 ? 'ml-auto' : ''}`} />
              ))}
            </div>
          ) : error ? (
            <p className="rounded-3xl bg-white/70 p-4 text-sm font-semibold text-rose-700">{error}</p>
          ) : messages.length === 0 ? (
            <EmptyState icon={Heart} title="No messages yet ❤️" description="Start with something tiny, sweet, or wonderfully random." />
          ) : (
            <div className="grid gap-3">
              {messages.map((message) => {
                const isMine = message.from === role;
                const seenByOther = message.from === 'me' ? message.seenByHer : message.seenByMe;

                return (
                  <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[82%] rounded-[1.5rem] px-4 py-3 shadow-sm ${
                        isMine
                          ? 'rounded-br-md bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-rose-300/30'
                          : 'rounded-bl-md bg-white/85 text-rose-950'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
                      <div className={`mt-1 flex items-center gap-2 text-[0.68rem] ${isMine ? 'text-white/75' : 'text-rose-500/70'}`}>
                        <span>{formatTime(message.createdAt)}</span>
                        {isMine ? <span>{seenByOther ? 'Seen' : 'Sent'}</span> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-white/70 bg-white/55 p-3">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Write something sweet..."
            className="min-w-0 flex-1 rounded-full border border-rose-100 bg-white/85 px-4 py-3 text-sm text-rose-950 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
          />
          <Button type="submit" disabled={sending || !text.trim()} className="size-12 p-0" aria-label="Send message">
            <SendHorizonal className="size-5" />
          </Button>
        </form>
      </section>
    </Page>
  );
}
