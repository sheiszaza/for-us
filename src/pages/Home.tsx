import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { limit, orderBy } from 'firebase/firestore';
import { CalendarHeart, Heart, ImagePlus, Mail, MessageCircle, Sparkles, Timer } from 'lucide-react';
import { useRole } from '../context/RoleContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { formatShortDate, formatTime, getCountdownParts } from '../lib/date';
import { getRoleLabel } from '../lib/roles';
import type { Countdown, DateIdea, Memory, Message } from '../types';
import { Card } from '../components/Card';
import { Page } from '../components/Page';

const cards = [
  { to: '/messages', label: 'Messages', text: 'Send a little thought in real time.', icon: MessageCircle },
  { to: '/memories', label: 'Memories', text: 'Keep the moments that made you smile.', icon: Heart },
  { to: '/letters', label: 'Letters', text: 'Open something sweet at the right time.', icon: Mail },
  { to: '/countdowns', label: 'Countdowns', text: 'Watch the next special day get closer.', icon: Timer },
  { to: '/date-ideas', label: 'Date Ideas', text: 'Plan something soft, fun, and unforgettable.', icon: CalendarHeart },
];

const quotes = [
  'Every ordinary day becomes ours when we write it together.',
  'You are my favorite notification, memory, and future plan.',
  'Some hearts do not need a crowd. They just need each other.',
];

export function Home() {
  const { role } = useRole();
  const quote = quotes[new Date().getDate() % quotes.length];
  const latestMemoryConstraints = useMemo(() => [orderBy('date', 'desc'), limit(1)], []);
  const latestMessageConstraints = useMemo(() => [orderBy('createdAt', 'desc'), limit(1)], []);
  const dateIdeaConstraints = useMemo(() => [orderBy('title', 'asc')], []);
  const countdownConstraints = useMemo(() => [orderBy('targetDate', 'asc')], []);
  const { data: memories, loading: memoriesLoading } = useRealtimeCollection<Memory>('memories', latestMemoryConstraints);
  const { data: messages, loading: messagesLoading } = useRealtimeCollection<Message>('messages', latestMessageConstraints);
  const { data: dateIdeas, loading: dateIdeasLoading } = useRealtimeCollection<DateIdea>('dateIdeas', dateIdeaConstraints);
  const { data: countdowns, loading: countdownsLoading } = useRealtimeCollection<Countdown>('countdowns', countdownConstraints);
  const latestMemory = memories[0];
  const latestMessage = messages[0];
  const nextDateIdea = dateIdeas.find((idea) => idea.status !== 'completed') ?? dateIdeas[0];
  const nextCountdown = countdowns.find((countdown) => getCountdownParts(countdown.targetDate).complete === false) ?? countdowns[0];
  const countdownParts = nextCountdown ? getCountdownParts(nextCountdown.targetDate) : null;

  return (
    <Page eyebrow="Our little dashboard" title={`Hi, ${role ? getRoleLabel(role) : 'Love'}`} description="A soft little overview of what is new, what is next, and what already feels special.">
      <Card className="overflow-hidden bg-gradient-to-br from-rose-100 via-pink-100 to-fuchsia-100 text-rose-950">
        <div className="relative">
          <div className="absolute -right-12 -top-16 size-40 rounded-full bg-rose-300/30 blur-2xl" />
          <div className="absolute -bottom-16 -left-10 size-36 rounded-full bg-fuchsia-300/25 blur-2xl" />
          <div className="mb-5 grid size-12 place-items-center rounded-full bg-white/70 text-rose-500 shadow-lg shadow-rose-200/50">
            <Sparkles className="size-6" />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-rose-950/75">Today’s note</p>
          <h2 className="mt-3 text-3xl font-black leading-tight">{quote}</h2>
          <p className="mt-5 text-sm leading-6 text-rose-950/85">A tiny reminder: love can live inside small rituals, silly plans, and messages sent just because.</p>
        </div>
      </Card>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 sm:grid-cols-2">
        <Link to="/memories">
          <Card className="h-full transition hover:-translate-y-0.5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-rose-100 text-rose-500">
                <Heart className="size-5 fill-current" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Latest memory</span>
            </div>
            {memoriesLoading ? (
              <DashboardLoading />
            ) : latestMemory ? (
              <>
                {latestMemory.imageUrl ? (
                  <img src={latestMemory.imageUrl} alt={latestMemory.title} className="mb-4 h-36 w-full rounded-[1.5rem] object-cover" />
                ) : (
                  <div className="mb-4 grid h-36 place-items-center rounded-[1.5rem] bg-rose-100 text-rose-400">
                    <ImagePlus className="size-8" />
                  </div>
                )}
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">{formatShortDate(latestMemory.date)}</p>
                <h3 className="mt-2 text-xl font-black text-rose-950">{latestMemory.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-rose-700/75">{latestMemory.description || 'A sweet moment saved for later.'}</p>
              </>
            ) : (
              <DashboardEmpty title="No memory yet" text="Save a photo, a date, or a tiny inside joke." />
            )}
          </Card>
        </Link>

        <Link to="/messages">
          <Card className="h-full transition hover:-translate-y-0.5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-pink-100 text-pink-500">
                <MessageCircle className="size-5" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Latest chat</span>
            </div>
            {messagesLoading ? (
              <DashboardLoading />
            ) : latestMessage ? (
              <>
                <p className="rounded-[1.5rem] bg-white/75 px-4 py-3 text-sm leading-6 text-rose-950 shadow-sm">{latestMessage.text}</p>
                <p className="mt-3 text-xs font-bold text-rose-500">
                  {getRoleLabel(latestMessage.from)} · {formatTime(latestMessage.createdAt)}
                </p>
              </>
            ) : (
              <DashboardEmpty title="No messages yet" text="Send the first little thought of the day." />
            )}
          </Card>
        </Link>

        <Link to="/date-ideas">
          <Card className="h-full transition hover:-translate-y-0.5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-fuchsia-100 text-fuchsia-500">
                <CalendarHeart className="size-5" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Next date</span>
            </div>
            {dateIdeasLoading ? (
              <DashboardLoading />
            ) : nextDateIdea ? (
              <>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-rose-500">{nextDateIdea.status}</span>
                <h3 className="mt-4 text-xl font-black text-rose-950">{nextDateIdea.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-rose-700/75">{nextDateIdea.description || 'A cute plan waiting for details.'}</p>
              </>
            ) : (
              <DashboardEmpty title="No date idea yet" text="Add a picnic, movie night, walk, or cafe plan." />
            )}
          </Card>
        </Link>

        <Link to="/countdowns">
          <Card className="h-full transition hover:-translate-y-0.5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-rose-100 text-rose-500">
                <Timer className="size-5" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Coming up</span>
            </div>
            {countdownsLoading ? (
              <DashboardLoading />
            ) : nextCountdown && countdownParts ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">{formatShortDate(nextCountdown.targetDate)}</p>
                <h3 className="mt-2 text-xl font-black text-rose-950">{nextCountdown.title}</h3>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    ['Days', countdownParts.days],
                    ['Hours', countdownParts.hours],
                    ['Mins', countdownParts.minutes],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-3xl bg-rose-50 p-3 text-center">
                      <p className="text-xl font-black text-rose-950">{value}</p>
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-rose-400">{label}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <DashboardEmpty title="Nothing counting down" text="Add something sweet to look forward to." />
            )}
          </Card>
        </Link>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map(({ to, label, text, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="h-full transition hover:-translate-y-0.5">
              <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-rose-100 text-rose-500">
                <Icon className="size-5" />
              </div>
              <h3 className="font-black text-rose-950">{label}</h3>
              <p className="mt-2 text-xs leading-5 text-rose-700/70">{text}</p>
            </Card>
          </Link>
        ))}
      </motion.section>
    </Page>
  );
}

function DashboardLoading() {
  return (
    <div className="grid gap-3">
      <div className="h-4 w-2/3 animate-pulse rounded-full bg-rose-100" />
      <div className="h-4 w-full animate-pulse rounded-full bg-rose-100" />
      <div className="h-4 w-4/5 animate-pulse rounded-full bg-rose-100" />
    </div>
  );
}

type DashboardEmptyProps = {
  title: string;
  text: string;
};

function DashboardEmpty({ title, text }: DashboardEmptyProps) {
  return (
    <div className="rounded-[1.5rem] bg-white/65 p-4">
      <h3 className="font-black text-rose-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-rose-700/75">{text}</p>
    </div>
  );
}
