import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { addDoc, collection, deleteDoc, doc, orderBy, updateDoc } from 'firebase/firestore';
import { CalendarHeart, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../firebaseData';
import { useRole } from '../context/RoleContext';
import { useNow } from '../hooks/useNow';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { formatShortDate, getCountdownParts } from '../lib/date';
import { getRoleLabel } from '../lib/roles';
import type { Countdown } from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Field } from '../components/Field';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Modal } from '../components/Modal';
import { Page } from '../components/Page';

const examples = ['Anniversary', 'Birthday', 'Vacation', 'Next Date'];

const defaultTargetDate = () => {
  const date = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  date.setSeconds(0, 0);
  return date.toISOString().slice(0, 16);
};

const initialForm = {
  title: '',
  targetDate: defaultTargetDate(),
};

export function Countdowns() {
  const { role } = useRole();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Countdown | null>(null);
  const [form, setForm] = useState(initialForm);
  const constraints = useMemo(() => [orderBy('targetDate', 'asc')], []);
  const { data: countdowns, loading, error } = useRealtimeCollection<Countdown>('countdowns', constraints);
  useNow();

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setForm({ title: '', targetDate: defaultTargetDate() });
  }, []);

  const openNew = useCallback(() => {
    setEditing(null);
    setForm({ title: '', targetDate: defaultTargetDate() });
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((countdown: Countdown) => {
    setEditing(countdown);
    setForm({ title: countdown.title, targetDate: countdown.targetDate });
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!role || !form.title.trim() || !form.targetDate) {
        return;
      }

      try {
        if (editing) {
          await updateDoc(doc(db, 'countdowns', editing.id), form);
          toast.success('Countdown updated.');
        } else {
          await addDoc(collection(db, 'countdowns'), {
            ...form,
            createdBy: role,
          });
          toast.success('Countdown added.');
        }

        closeModal();
      } catch (countdownError) {
        toast.error(countdownError instanceof Error ? countdownError.message : 'Countdown could not be saved.');
      }
    },
    [closeModal, editing, form, role],
  );

  const handleDelete = useCallback(async (countdown: Countdown) => {
    if (!window.confirm('Delete this countdown?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'countdowns', countdown.id));
      toast.success('Countdown deleted.');
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Countdown could not be deleted.');
    }
  }, []);

  return (
    <Page
      eyebrow="Almost there"
      title="Countdowns"
      description="Watch the sweetest future plans get closer every second."
      action={
        <Button onClick={openNew} className="size-[3.75rem] p-0 shadow-xl shadow-rose-300/50" aria-label="Add countdown">
          <Plus className="size-12 stroke-[3]" />
        </Button>
      }
    >
      <div className="flex gap-2 overflow-x-auto pb-1">
        {examples.map((example) => (
          <button
            key={example}
            onClick={() => {
              setForm({ title: example, targetDate: defaultTargetDate() });
              setModalOpen(true);
            }}
            className="shrink-0 rounded-full bg-white/70 px-4 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-100"
          >
            {example}
          </button>
        ))}
      </div>

      {loading ? <LoadingSkeleton /> : null}
      {error ? <p className="rounded-3xl bg-white/70 p-4 text-sm font-semibold text-rose-700">{error}</p> : null}
      {!loading && countdowns.length === 0 ? (
        <EmptyState icon={CalendarHeart} title="No countdowns yet." description="Add an anniversary, birthday, vacation, or the next date you cannot wait for." />
      ) : null}

      <section className="grid gap-4">
        {countdowns.map((countdown) => {
          const parts = getCountdownParts(countdown.targetDate);

          return (
            <Card key={countdown.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-400">{formatShortDate(countdown.targetDate)}</p>
                  <h2 className="mt-2 text-2xl font-black text-rose-950">{countdown.title}</h2>
                  <p className="mt-1 text-xs font-bold text-rose-500">Added by {getRoleLabel(countdown.createdBy)}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" className="size-9 p-0" onClick={() => openEdit(countdown)} aria-label="Edit countdown">
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" className="size-9 p-0 text-rose-900" onClick={() => void handleDelete(countdown)} aria-label="Delete countdown">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {[
                  ['Days', parts.days],
                  ['Hours', parts.hours],
                  ['Mins', parts.minutes],
                  ['Secs', parts.seconds],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-3xl bg-rose-50 p-3 text-center">
                    <p className="text-2xl font-black text-rose-950">{value}</p>
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-rose-400">{label}</p>
                  </div>
                ))}
              </div>
              {parts.complete ? <p className="mt-4 rounded-3xl bg-rose-100 px-4 py-3 text-sm font-bold text-rose-700">Today is the day ❤️</p> : null}
            </Card>
          );
        })}
      </section>

      <Modal open={modalOpen} title={editing ? 'Edit countdown' : 'Add countdown'} onClose={closeModal}>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field label="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          <Field label="Target date" type="datetime-local" value={form.targetDate} onChange={(event) => setForm((current) => ({ ...current, targetDate: event.target.value }))} required />
          <Button type="submit">{editing ? 'Save countdown' : 'Add countdown'}</Button>
        </form>
      </Modal>
    </Page>
  );
}
