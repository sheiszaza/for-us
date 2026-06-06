import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { addDoc, collection, deleteDoc, doc, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { Grid2X2, Heart, ImagePlus, List, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, storage } from '../firebaseData';
import { useRole } from '../context/RoleContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { formatShortDate } from '../lib/date';
import { getRoleLabel } from '../lib/roles';
import type { Memory } from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Field, TextArea } from '../components/Field';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Modal } from '../components/Modal';
import { Page } from '../components/Page';

type ViewMode = 'grid' | 'timeline';

const initialForm = {
  title: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
};

export function Memories() {
  const { role } = useRole();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const constraints = useMemo(() => [orderBy('date', 'desc')], []);
  const { data: memories, loading, error } = useRealtimeCollection<Memory>('memories', constraints);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setForm(initialForm);
    setFile(null);
    setUploadProgress(null);
  }, []);

  const openNew = useCallback(() => {
    setEditing(null);
    setForm(initialForm);
    setFile(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((memory: Memory) => {
    setEditing(memory);
    setForm({ title: memory.title, description: memory.description, date: memory.date });
    setFile(null);
    setModalOpen(true);
  }, []);

  const uploadImage = useCallback(async (image: File) => {
    const imagePath = `memories/${Date.now()}-${image.name.replace(/\s+/g, '-')}`;
    const uploadRef = ref(storage, imagePath);
    const task = uploadBytesResumable(uploadRef, image);

    return new Promise<{ imageUrl: string; imagePath: string }>((resolve, reject) => {
      task.on(
        'state_changed',
        (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
        reject,
        async () => {
          const imageUrl = await getDownloadURL(task.snapshot.ref);
          resolve({ imageUrl, imagePath });
        },
      );
    });
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!role || !form.title.trim()) {
        return;
      }

      try {
        let imageData: { imageUrl: string; imagePath: string } | null = null;

        if (file) {
          imageData = await uploadImage(file);
        }

        if (editing) {
          await updateDoc(doc(db, 'memories', editing.id), {
            ...form,
            ...(imageData ?? {}),
            updatedAt: serverTimestamp(),
          });
          toast.success('Memory updated.');
        } else {
          await addDoc(collection(db, 'memories'), {
            ...form,
            imageUrl: imageData?.imageUrl ?? '',
            imagePath: imageData?.imagePath ?? '',
            createdBy: role,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          toast.success('Memory added.');
        }

        closeModal();
      } catch (memoryError) {
        toast.error(memoryError instanceof Error ? memoryError.message : 'Memory could not be saved.');
      }
    },
    [closeModal, editing, file, form, role, uploadImage],
  );

  const handleDelete = useCallback(async (memory: Memory) => {
    const confirmed = window.confirm('Delete this memory forever?');

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'memories', memory.id));

      if (memory.imagePath) {
        await deleteObject(ref(storage, memory.imagePath)).catch(() => undefined);
      }

      toast.success('Memory deleted.');
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Memory could not be deleted.');
    }
  }, []);

  return (
    <Page
      eyebrow="Moments"
      title="Memories"
      description="A soft timeline of the little and big things you never want to lose."
      action={
        <Button onClick={openNew} className="size-[3.75rem] p-0 shadow-xl shadow-rose-300/50" aria-label="Add memory">
          <Plus className="size-12 stroke-[3]" />
        </Button>
      }
    >
      <div className="flex rounded-full bg-white/60 p-1 ring-1 ring-rose-100">
        <Button variant={viewMode === 'grid' ? 'primary' : 'ghost'} className="flex-1 py-2" onClick={() => setViewMode('grid')}>
          <Grid2X2 className="size-4" />
          Grid
        </Button>
        <Button variant={viewMode === 'timeline' ? 'primary' : 'ghost'} className="flex-1 py-2" onClick={() => setViewMode('timeline')}>
          <List className="size-4" />
          Timeline
        </Button>
      </div>

      {loading ? <LoadingSkeleton /> : null}
      {error ? <p className="rounded-3xl bg-white/70 p-4 text-sm font-semibold text-rose-700">{error}</p> : null}
      {!loading && memories.length === 0 ? (
        <EmptyState icon={Heart} title="Your memories together will appear here." description="Add your first photo, date, inside joke, or favorite ordinary day." />
      ) : null}

      {!loading && memories.length > 0 ? (
        <section className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
          {memories.map((memory) => (
            <Card key={memory.id} className={viewMode === 'timeline' ? 'relative ml-5 before:absolute before:-left-5 before:top-8 before:size-3 before:rounded-full before:bg-rose-400' : ''}>
              {memory.imageUrl ? (
                <img src={memory.imageUrl} alt={memory.title} className="mb-4 h-48 w-full rounded-[1.5rem] object-cover" />
              ) : (
                <div className="mb-4 grid h-48 place-items-center rounded-[1.5rem] bg-rose-100 text-rose-400">
                  <ImagePlus className="size-10" />
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-400">{formatShortDate(memory.date)}</p>
                  <h2 className="mt-2 text-xl font-black text-rose-950">{memory.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-rose-700/75">{memory.description}</p>
                  <p className="mt-3 text-xs font-bold text-rose-500">Added by {getRoleLabel(memory.createdBy)}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" className="size-9 p-0" onClick={() => openEdit(memory)} aria-label="Edit memory">
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" className="size-9 p-0 text-rose-900" onClick={() => void handleDelete(memory)} aria-label="Delete memory">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      <Modal open={modalOpen} title={editing ? 'Edit memory' : 'Add memory'} onClose={closeModal}>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field label="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          <TextArea label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          <Field label="Date" type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
          <Field label="Image" type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          {uploadProgress !== null ? (
            <div className="rounded-3xl bg-white/70 p-3">
              <div className="h-2 overflow-hidden rounded-full bg-rose-100">
                <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="mt-2 text-xs font-bold text-rose-500">{uploadProgress}% uploaded</p>
            </div>
          ) : null}
          <Button type="submit">{editing ? 'Save memory' : 'Add memory'}</Button>
        </form>
      </Modal>
    </Page>
  );
}
