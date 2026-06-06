import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  doc,
  limit,
  orderBy,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  CalendarHeart,
  Gamepad2,
  Heart,
  ImagePlus,
  MessageCircle,
  Plus,
  Timer,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNicknames } from "../context/NicknameContext";
import { useRole } from "../context/RoleContext";
import { db } from "../firebaseData";
import { useRealtimeCollection } from "../hooks/useRealtimeCollection";
import { formatShortDate, formatTime, getCountdownParts } from "../lib/date";
import type {
  Countdown,
  DateIdea,
  HomeNote,
  Memory,
  Message,
  Role,
} from "../types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { TextArea } from "../components/Field";
import { Modal } from "../components/Modal";
import { Page } from "../components/Page";

const getPartnerRole = (role: Role): Role => (role === "me" ? "her" : "me");

export function Home() {
  const { role } = useRole();
  const { getNickname } = useNicknames();
  const [noteDraft, setNoteDraft] = useState("");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const homeNoteConstraints = useMemo(() => [], []);
  const latestMemoryConstraints = useMemo(
    () => [orderBy("date", "desc"), limit(1)],
    []
  );
  const latestMessageConstraints = useMemo(
    () => [orderBy("createdAt", "desc"), limit(1)],
    []
  );
  const dateIdeaConstraints = useMemo(() => [orderBy("title", "asc")], []);
  const countdownConstraints = useMemo(
    () => [orderBy("targetDate", "asc")],
    []
  );
  const { data: homeNotes, loading: notesLoading } =
    useRealtimeCollection<HomeNote>("homeNotes", homeNoteConstraints);
  const { data: memories, loading: memoriesLoading } =
    useRealtimeCollection<Memory>("memories", latestMemoryConstraints);
  const { data: messages, loading: messagesLoading } =
    useRealtimeCollection<Message>("messages", latestMessageConstraints);
  const { data: dateIdeas, loading: dateIdeasLoading } =
    useRealtimeCollection<DateIdea>("dateIdeas", dateIdeaConstraints);
  const { data: countdowns, loading: countdownsLoading } =
    useRealtimeCollection<Countdown>("countdowns", countdownConstraints);
  const partnerRole = role ? getPartnerRole(role) : null;
  const receivedNote = role
    ? homeNotes.find((note) => note.targetRole === role)
    : null;
  const noteForPartner = partnerRole
    ? homeNotes.find((note) => note.targetRole === partnerRole)
    : null;
  const latestMemory = memories[0];
  const latestMessage = messages[0];
  const nextDateIdea =
    dateIdeas.find((idea) => idea.status !== "completed") ?? dateIdeas[0];
  const nextCountdown =
    countdowns.find(
      (countdown) => getCountdownParts(countdown.targetDate).complete === false
    ) ?? countdowns[0];
  const countdownParts = nextCountdown
    ? getCountdownParts(nextCountdown.targetDate)
    : null;

  useEffect(() => {
    setNoteDraft(noteForPartner?.text ?? "");
  }, [noteForPartner?.text]);

  const handleSaveNote = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!role || !partnerRole || !noteDraft.trim()) {
        toast.error("Write a little note first.");
        return;
      }

      setSavingNote(true);

      try {
        await setDoc(
          doc(db, "homeNotes", partnerRole),
          {
            text: noteDraft.trim(),
            fromRole: role,
            targetRole: partnerRole,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        toast.success(`Note for ${getNickname(partnerRole)} saved.`);
        setNoteModalOpen(false);
      } catch (noteError) {
        toast.error(
          noteError instanceof Error
            ? noteError.message
            : "Note could not be saved."
        );
      } finally {
        setSavingNote(false);
      }
    },
    [noteDraft, partnerRole, role]
  );

  return (
    <Page
      eyebrow="Our little dashboard"
      title={`Hi, ${role ? getNickname(role) : "Love"}`}
      description="A soft little overview of what is new, what is next, and what already feels special."
    >
      <Card className="overflow-hidden bg-gradient-to-br from-rose-100 via-pink-100 to-fuchsia-100 text-rose-950">
        <div className="relative">
          <div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-rose-300/30 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 size-36 rounded-full bg-fuchsia-300/25 blur-2xl" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-rose-950/75">
              {role && receivedNote
                ? `${getNickname(
                    receivedNote.fromRole
                  )} wrote for ${getNickname(role)}`
                : "Today’s note"}
            </p>
            {role && partnerRole ? (
              <Button
                type="button"
                className="size-[3.75rem] shrink-0 p-0 shadow-xl shadow-rose-300/50"
                onClick={() => setNoteModalOpen(true)}
                aria-label={`Write a note for ${getNickname(partnerRole)}`}
              >
                <Plus className="size-12 stroke-[3]" />
              </Button>
            ) : null}
          </div>
          <h2 className="relative z-10 text-3xl font-black leading-tight">
            {notesLoading
              ? "Loading your note..."
              : receivedNote?.text ||
                (partnerRole
                  ? `No note from ${getNickname(partnerRole)} yet.`
                  : "Pick a role to see your note.")}
          </h2>
        </div>
      </Card>

      {role && partnerRole ? (
        <Modal
          open={noteModalOpen}
          title={`Write a note for ${getNickname(partnerRole)}`}
          onClose={() => setNoteModalOpen(false)}
        >
          <form onSubmit={handleSaveNote} className="grid gap-4">
            <TextArea
              label="Note"
              rows={5}
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder={`This will show on ${getNickname(
                partnerRole
              )}'s home screen.`}
              autoFocus
            />
            <Button type="submit" disabled={savingNote || !noteDraft.trim()}>
              {savingNote
                ? "Saving..."
                : `Save for ${getNickname(partnerRole)}`}
            </Button>
          </form>
        </Modal>
      ) : null}

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Link to="/memories">
          <Card className="h-full transition hover:-translate-y-0.5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-rose-100 text-rose-500">
                <Heart className="size-5 fill-current" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">
                Latest memory
              </span>
            </div>
            {memoriesLoading ? (
              <DashboardLoading />
            ) : latestMemory ? (
              <>
                {latestMemory.imageUrl ? (
                  <img
                    src={latestMemory.imageUrl}
                    alt={latestMemory.title}
                    className="mb-4 aspect-[3/4] w-full rounded-[1.5rem] object-cover"
                  />
                ) : (
                  <div className="mb-4 grid aspect-[3/4] w-full place-items-center rounded-[1.5rem] bg-rose-100 text-rose-400">
                    <ImagePlus className="size-8" />
                  </div>
                )}
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">
                  {formatShortDate(latestMemory.date)}
                </p>
                <h3 className="mt-2 text-xl font-black text-rose-950">
                  {latestMemory.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-rose-700/75">
                  {latestMemory.description ||
                    "A sweet moment saved for later."}
                </p>
              </>
            ) : (
              <DashboardEmpty
                title="No memory yet"
                text="Save a photo, a date, or a tiny inside joke."
              />
            )}
          </Card>
        </Link>

        <Link to="/messages">
          <Card className="h-full transition hover:-translate-y-0.5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-pink-100 text-pink-500">
                <MessageCircle className="size-5" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">
                Latest chat
              </span>
            </div>
            {messagesLoading ? (
              <DashboardLoading />
            ) : latestMessage ? (
              <>
                {latestMessage.imageUrl ? (
                  <div className="overflow-hidden rounded-[1.5rem] bg-white/75 shadow-sm">
                    <img
                      src={latestMessage.imageUrl}
                      alt="Shared image"
                      className="h-32 w-full object-cover"
                    />
                    {latestMessage.text ? (
                      <p className="px-4 py-3 text-sm leading-6 text-rose-950">
                        {latestMessage.text}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-[1.5rem] bg-white/75 px-4 py-3 text-sm leading-6 text-rose-950 shadow-sm">
                    {latestMessage.text}
                  </p>
                )}
                <p className="mt-3 text-xs font-bold text-rose-500">
                  {getNickname(latestMessage.from)} ·{" "}
                  {formatTime(latestMessage.createdAt)}
                </p>
              </>
            ) : (
              <DashboardEmpty
                title="No messages yet"
                text="Send the first little thought of the day."
              />
            )}
          </Card>
        </Link>

        <Link to="/date-ideas">
          <Card className="h-full transition hover:-translate-y-0.5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-fuchsia-100 text-fuchsia-500">
                <CalendarHeart className="size-5" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">
                Next date
              </span>
            </div>
            {dateIdeasLoading ? (
              <DashboardLoading />
            ) : nextDateIdea ? (
              <>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-rose-500">
                  {nextDateIdea.status}
                </span>
                <h3 className="mt-4 text-xl font-black text-rose-950">
                  {nextDateIdea.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-rose-700/75">
                  {nextDateIdea.description ||
                    "A cute plan waiting for details."}
                </p>
              </>
            ) : (
              <DashboardEmpty
                title="No date idea yet"
                text="Add a picnic, movie night, walk, or cafe plan."
              />
            )}
          </Card>
        </Link>

        <Link to="/countdowns">
          <Card className="h-full transition hover:-translate-y-0.5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-rose-100 text-rose-500">
                <Timer className="size-5" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">
                Coming up
              </span>
            </div>
            {countdownsLoading ? (
              <DashboardLoading />
            ) : nextCountdown && countdownParts ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">
                  {formatShortDate(nextCountdown.targetDate)}
                </p>
                <h3 className="mt-2 text-xl font-black text-rose-950">
                  {nextCountdown.title}
                </h3>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    ["Days", countdownParts.days],
                    ["Hours", countdownParts.hours],
                    ["Mins", countdownParts.minutes],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-3xl bg-rose-50 p-3 text-center"
                    >
                      <p className="text-xl font-black text-rose-950">
                        {value}
                      </p>
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-rose-400">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <DashboardEmpty
                title="Nothing counting down"
                text="Add something sweet to look forward to."
              />
            )}
          </Card>
        </Link>
      </motion.section>

      <Link to="/games">
        <Card className="group overflow-hidden bg-gradient-to-br from-violet-100 via-fuchsia-100 to-pink-100 transition hover:-translate-y-0.5">
          <div className="relative">
            <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-violet-300/30 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 size-28 rounded-full bg-fuchsia-300/25 blur-2xl" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-300/50">
                <Gamepad2 className="size-7" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">
                  Play together
                </span>
                <h3 className="text-xl font-black text-violet-950">
                  Couple Games
                </h3>
              </div>
              <div className="text-3xl opacity-0 transition-opacity group-hover:opacity-100">
                🎮
              </div>
            </div>
          </div>
        </Card>
      </Link>
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
