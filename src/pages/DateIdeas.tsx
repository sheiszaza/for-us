import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { addDoc, collection, deleteDoc, doc, orderBy, updateDoc } from 'firebase/firestore';
import { Plus, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../firebaseData';
import { useNicknames } from '../context/NicknameContext';
import { useRole } from '../context/RoleContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
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
  const { getNickname } = useNicknames();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DateIdea | null>(null);
  const [ideaToDelete, setIdeaToDelete] = useState<DateIdea | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const requestDelete = useCallback((idea: DateIdea) => {
    setIdeaToDelete(idea);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (isDeleting) {
      return;
    }

    setIdeaToDelete(null);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!ideaToDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteDoc(doc(db, 'dateIdeas', ideaToDelete.id));
      toast.success('Date idea deleted.');
      setIdeaToDelete(null);
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Date idea could not be deleted.');
    } finally {
      setIsDeleting(false);
    }
  }, [ideaToDelete, isDeleting]);

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
        <Button onClick={openNew} className="size-[3.75rem] p-0 shadow-xl shadow-rose-300/50" aria-label="Add date idea">
          <Plus className="size-12 stroke-[3]" />
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
                <p className="mt-3 text-xs font-bold text-rose-500">Added by {getNickname(idea.createdBy)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {idea.status !== 'completed' ? (
                  <button
                    type="button"
                    className="grid size-8 place-items-center rounded-full text-emerald-600 transition hover:text-emerald-800"
                    onClick={() => void markCompleted(idea)}
                    aria-label="Mark completed"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="size-5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </button>
                ) : null}
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-full text-rose-600 transition hover:text-rose-800"
                  onClick={() => openEdit(idea)}
                  aria-label="Edit date idea"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-full text-red-600 transition hover:text-red-800"
                  onClick={() => requestDelete(idea)}
                  aria-label="Delete date idea"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M6 6l1 15h10l1-15" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </button>
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

      <Modal open={Boolean(ideaToDelete)} title="Delete date idea?" onClose={closeDeleteModal}>
        <div className="grid gap-5">
          <p className="text-sm leading-6 text-rose-700">
            This will permanently delete
            {ideaToDelete ? ` "${ideaToDelete.title}"` : ' this date idea'}.
            This action cannot be undone.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={closeDeleteModal} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} disabled={isDeleting} aria-busy={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}
