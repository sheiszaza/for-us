import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { addDoc, collection, deleteDoc, doc, orderBy, updateDoc } from 'firebase/firestore';
import { Check, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../firebaseData';
import { useRole } from '../context/RoleContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { getRoleLabel } from '../lib/roles';
import type { DateIdea, DateIdeaStatus } from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Field, TextArea } from '../components/Field';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Modal } from '../components/Modal';
import { Page } from '../components/Page';

const initialForm: Pick<DateIdea, 'title' | 'description' | 'status'> = {
  title: '',
  description: '',
  status: 'planned',
};

const statusLabels: Record<DateIdeaStatus, string> = {
  planned: 'Planned',
  upcoming: 'Upcoming',
  completed: 'Completed',
};

export function DateIdeas() {
  const { role } = useRole();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DateIdea | null>(null);
  const [form, setForm] = useState(initialForm);
  const constraints = useMemo(() => [orderBy('title', 'asc')], []);
  const { data: ideas, loading, error } = useRealtimeCollection<DateIdea>('dateIdeas', constraints);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setForm(initialForm);
  }, []);

  const openNew = useCallback(() => {
    setEditing(null);
    setForm(initialForm);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((idea: DateIdea) => {
    setEditing(idea);
    setForm({ title: idea.title, description: idea.description, status: idea.status });
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!role || !form.title.trim()) {
        return;
      }

      try {
        if (editing) {
          await updateDoc(doc(db, 'dateIdeas', editing.id), form);
          toast.success('Date idea updated.');
        } else {
          await addDoc(collection(db, 'dateIdeas'), {
            ...form,
            createdBy: role,
          });
          toast.success('Date idea added.');
        }

        closeModal();
      } catch (ideaError) {
        toast.error(ideaError instanceof Error ? ideaError.message : 'Date idea could not be saved.');
      }
    },
    [closeModal, editing, form, role],
  );

  const handleDelete = useCallback(async (idea: DateIdea) => {
    if (!window.confirm('Delete this date idea?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'dateIdeas', idea.id));
      toast.success('Date idea deleted.');
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Date idea could not be deleted.');
    }
  }, []);

  const markCompleted = useCallback(async (idea: DateIdea) => {
    try {
      await updateDoc(doc(db, 'dateIdeas', idea.id), { status: 'completed' });
      toast.success('Marked completed.');
    } catch (statusError) {
      toast.error(statusError instanceof Error ? statusError.message : 'Status could not be updated.');
    }
  }, []);

  return (
    <Page
      eyebrow="Plans"
      title="Date Ideas"
      description="Collect sweet plans before they become memories."
      action={
        <Button onClick={openNew} className="size-12 p-0" aria-label="Add date idea">
          <Plus className="size-5" />
        </Button>
      }
    >
      {loading ? <LoadingSkeleton /> : null}
      {error ? <p className="rounded-3xl bg-white/70 p-4 text-sm font-semibold text-rose-700">{error}</p> : null}
      {!loading && ideas.length === 0 ? (
        <EmptyState icon={Sparkles} title="No date ideas yet. Plan something special." description="A picnic, a movie night, a walk, a new cafe, or anything that feels like yours." />
      ) : null}

      <section className="grid gap-4">
        {ideas.map((idea) => (
          <Card key={idea.id} className={idea.status === 'completed' ? 'opacity-80' : ''}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-rose-500">
                  {statusLabels[idea.status]}
                </span>
                <h2 className="mt-4 text-2xl font-black text-rose-950">{idea.title}</h2>
                <p className="mt-2 text-sm leading-6 text-rose-700/75">{idea.description || 'A sweet plan waiting for details.'}</p>
                <p className="mt-3 text-xs font-bold text-rose-500">Added by {getRoleLabel(idea.createdBy)}</p>
              </div>
              <div className="flex gap-1">
                {idea.status !== 'completed' ? (
                  <Button variant="ghost" className="size-9 p-0" onClick={() => void markCompleted(idea)} aria-label="Mark completed">
                    <Check className="size-4" />
                  </Button>
                ) : null}
                <Button variant="ghost" className="size-9 p-0" onClick={() => openEdit(idea)} aria-label="Edit date idea">
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" className="size-9 p-0 text-rose-900" onClick={() => void handleDelete(idea)} aria-label="Delete date idea">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <Modal open={modalOpen} title={editing ? 'Edit date idea' : 'Add date idea'} onClose={closeModal}>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field label="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          <TextArea label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          <label className="grid gap-2 text-sm font-semibold text-rose-800">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as DateIdeaStatus }))}
              className="w-full rounded-3xl border border-rose-100 bg-white/75 px-4 py-3 text-rose-950 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
            >
              <option value="planned">Planned</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <Button type="submit">{editing ? 'Save idea' : 'Add idea'}</Button>
        </form>
      </Modal>
    </Page>
  );
}
