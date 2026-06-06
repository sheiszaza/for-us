import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { motion } from "framer-motion";
import { Mail, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { db } from "../firebaseData";
import { useRole } from "../context/RoleContext";
import { useRealtimeCollection } from "../hooks/useRealtimeCollection";
import { formatShortDate } from "../lib/date";
import { getRoleLabel } from "../lib/roles";
import type { Letter } from "../types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { Field, TextArea } from "../components/Field";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { Modal } from "../components/Modal";
import { Page } from "../components/Page";

const examples = [
  "Open when you miss me",
  "Open when you are sad",
  "Open when you need motivation",
  "Open when you want to smile",
];

const initialForm = {
  title: "",
  content: "",
};

export function Letters() {
  const { role } = useRole();
  const [modalOpen, setModalOpen] = useState(false);
  const [reading, setReading] = useState<Letter | null>(null);
  const [editing, setEditing] = useState<Letter | null>(null);
  const [form, setForm] = useState(initialForm);
  const constraints = useMemo(() => [orderBy("createdAt", "desc")], []);
  const {
    data: letters,
    loading,
    error,
  } = useRealtimeCollection<Letter>("letters", constraints);

  const closeEditor = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setForm(initialForm);
  }, []);

  const openNew = useCallback(() => {
    setEditing(null);
    setForm(initialForm);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((letter: Letter) => {
    setEditing(letter);
    setForm({ title: letter.title, content: letter.content });
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!role || !form.title.trim() || !form.content.trim()) {
        return;
      }

      try {
        if (editing) {
          await updateDoc(doc(db, "letters", editing.id), form);
          toast.success("Letter updated.");
        } else {
          await addDoc(collection(db, "letters"), {
            ...form,
            createdBy: role,
            createdAt: serverTimestamp(),
          });
          toast.success("Letter saved.");
        }

        closeEditor();
      } catch (letterError) {
        toast.error(
          letterError instanceof Error
            ? letterError.message
            : "Letter could not be saved."
        );
      }
    },
    [closeEditor, editing, form, role]
  );

  const handleDelete = useCallback(async (letter: Letter) => {
    if (!window.confirm("Delete this letter?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "letters", letter.id));
      toast.success("Letter deleted.");
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Letter could not be deleted."
      );
    }
  }, []);

  return (
    <Page
      eyebrow="Open when"
      title="Letters"
      description="Little envelopes for the moments when words should arrive with care."
      action={
        <Button
          onClick={openNew}
          className="size-[3.75rem] p-0 shadow-xl shadow-rose-300/50"
          aria-label="Add letter"
        >
          <Plus className="size-12 stroke-[3]" />
        </Button>
      }
    >
      <div className="rounded-3xl bg-white/70 p-4 overflow-hidden">
        <p className="mb-3 text-sm font-bold text-rose-950">Ideas to start</p>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {examples.map((example) => (
            <button
              key={example}
              onClick={() => {
                setForm((current) => ({ ...current, title: example }));
                setModalOpen(true);
              }}
              className="shrink-0 rounded-full bg-white/70 px-4 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-100"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingSkeleton /> : null}
      {error ? (
        <p className="rounded-3xl bg-white/70 p-4 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
      {!loading && letters.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No letters yet."
          description="Write something to open on a hard day, a quiet day, or a very happy one."
        />
      ) : null}

      <section className="grid gap-4">
        {letters.map((letter) => (
          <Card key={letter.id} onClick={() => setReading(letter)}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-500">
                  <Mail className="size-6" />
                </div>
                <h2 className="text-xl font-black text-rose-950">
                  {letter.title}
                </h2>
                <p className="mt-2 text-xs font-bold text-rose-500">
                  Added by {getRoleLabel(letter.createdBy)} ·{" "}
                  {formatShortDate(letter.createdAt)}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  className="size-9 p-0"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEdit(letter);
                  }}
                  aria-label="Edit letter"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="size-9 p-0 text-rose-900"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDelete(letter);
                  }}
                  aria-label="Delete letter"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <Modal
        open={modalOpen}
        title={editing ? "Edit letter" : "Write a letter"}
        onClose={closeEditor}
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field
            label="Title"
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            required
          />
          <TextArea
            label="Content"
            rows={8}
            value={form.content}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                content: event.target.value,
              }))
            }
            required
          />
          <Button type="submit">
            {editing ? "Save letter" : "Seal letter"}
          </Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(reading)}
        title={reading?.title ?? "Letter"}
        onClose={() => setReading(null)}
      >
        {reading ? (
          <motion.article
            initial={{ rotateX: -88, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="origin-top rounded-[1.75rem] bg-white/85 p-5 shadow-inner shadow-rose-100"
          >
            <p className="whitespace-pre-wrap text-base leading-8 text-rose-950">
              {reading.content}
            </p>
            <p className="mt-6 text-xs font-bold text-rose-500">
              With love, {getRoleLabel(reading.createdBy)}
            </p>
          </motion.article>
        ) : null}
      </Modal>
    </Page>
  );
}
