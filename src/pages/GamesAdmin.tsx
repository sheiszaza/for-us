import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ArrowLeft, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { TextArea } from "../components/Field";
import { Page } from "../components/Page";
import { DEFAULT_GAME_CONTENT } from "../components/games/constants";
import { useRole } from "../context/RoleContext";
import { db } from "../firebaseData";
import { useGameContent } from "../hooks/useGameContent";
import type { GameContent, WouldYouRatherQuestion } from "../types";

type GameContentForm = {
  loveQuizQuestions: string;
  wouldYouRatherQuestions: string;
  truths: string;
  dares: string;
  wordGuessWords: string;
  coupleEmojis: string;
  typingPhrases: string;
};

const toLines = (items: string[]) => items.join("\n");

const toPairLines = (items: WouldYouRatherQuestion[]) =>
  items.map((item) => `${item.optionA} | ${item.optionB}`).join("\n");

const toForm = (content: GameContent): GameContentForm => ({
  loveQuizQuestions: toLines(content.loveQuizQuestions),
  wouldYouRatherQuestions: toPairLines(content.wouldYouRatherQuestions),
  truths: toLines(content.truths),
  dares: toLines(content.dares),
  wordGuessWords: toLines(content.wordGuessWords),
  coupleEmojis: toLines(content.coupleEmojis),
  typingPhrases: toLines(content.typingPhrases),
});

const parseLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const parsePairLines = (value: string): WouldYouRatherQuestion[] => {
  return parseLines(value).map((line) => {
    const separatorIndex = line.indexOf("|");

    if (separatorIndex === -1) {
      throw new Error("Would You Rather lines must use: Option A | Option B");
    }

    const optionA = line.slice(0, separatorIndex).trim();
    const optionB = line.slice(separatorIndex + 1).trim();

    if (!optionA || !optionB) {
      throw new Error("Would You Rather options cannot be blank.");
    }

    return { optionA, optionB };
  });
};

const parseGameContent = (form: GameContentForm): GameContent => {
  const content: GameContent = {
    loveQuizQuestions: parseLines(form.loveQuizQuestions),
    wouldYouRatherQuestions: parsePairLines(form.wouldYouRatherQuestions),
    truths: parseLines(form.truths),
    dares: parseLines(form.dares),
    wordGuessWords: parseLines(form.wordGuessWords).map((word) =>
      word.toUpperCase()
    ),
    coupleEmojis: parseLines(form.coupleEmojis),
    typingPhrases: parseLines(form.typingPhrases),
  };

  if (content.loveQuizQuestions.length === 0) {
    throw new Error("Add at least one Love Quiz question.");
  }

  if (content.wouldYouRatherQuestions.length === 0) {
    throw new Error("Add at least one Would You Rather question.");
  }

  if (content.truths.length === 0 || content.dares.length === 0) {
    throw new Error("Add at least one Truth and one Dare.");
  }

  if (content.wordGuessWords.length === 0) {
    throw new Error("Add at least one Word Guess suggestion.");
  }

  if (content.wordGuessWords.some((word) => word.length < 3 || word.length > 6)) {
    throw new Error("Word Guess suggestions must be 3-6 letters.");
  }

  if (content.coupleEmojis.length < 8) {
    throw new Error("Memory Match needs at least 8 emoji entries.");
  }

  if (content.typingPhrases.length === 0) {
    throw new Error("Add at least one Typing Race phrase.");
  }

  return content;
};

type EditableSectionProps = {
  title: string;
  description: string;
  label: string;
  value: string;
  rows?: number;
  placeholder: string;
  onChange: (value: string) => void;
};

function EditableSection({
  title,
  description,
  label,
  value,
  rows = 6,
  placeholder,
  onChange,
}: EditableSectionProps) {
  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-xl font-black text-rose-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-rose-700/75">{description}</p>
      </div>
      <TextArea
        label={label}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="font-mono text-sm"
      />
    </Card>
  );
}

export function GamesAdmin() {
  const navigate = useNavigate();
  const { role } = useRole();
  const { gameContent, loading, error, usingDefaults } = useGameContent();
  const [form, setForm] = useState<GameContentForm>(() => toForm(gameContent));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(toForm(gameContent));
  }, [gameContent]);

  const updateField = useCallback(
    (field: keyof GameContentForm, value: string) => {
      setForm((current) => ({ ...current, [field]: value }));
    },
    []
  );

  const saveContent = useCallback(
    async (content: GameContent) => {
      if (role !== "me") {
        toast.error("Only the admin role can save game content.");
        return;
      }

      setSaving(true);
      try {
        await setDoc(
          doc(db, "gameContent", "default"),
          {
            ...content,
            updatedAt: serverTimestamp(),
            updatedBy: role,
          },
          { merge: true }
        );
        toast.success("Game content saved.");
      } catch (saveError) {
        toast.error(
          saveError instanceof Error
            ? saveError.message
            : "Game content could not be saved."
        );
      } finally {
        setSaving(false);
      }
    },
    [role]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      try {
        await saveContent(parseGameContent(form));
      } catch (validationError) {
        toast.error(
          validationError instanceof Error
            ? validationError.message
            : "Please check the game content."
        );
      }
    },
    [form, saveContent]
  );

  const resetDefaults = useCallback(async () => {
    if (!window.confirm("Reset all game content to the built-in defaults?")) {
      return;
    }

    await saveContent(DEFAULT_GAME_CONTENT);
  }, [saveContent]);

  if (role !== "me") {
    return (
      <Page
        eyebrow="Admin"
        title="Games Content"
        description="Only the admin role can manage game questions and prompts."
        action={
          <Button variant="ghost" onClick={() => navigate("/games")}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      >
        <Card>
          <h2 className="text-xl font-black text-rose-950">No permission</h2>
          <p className="mt-2 text-sm leading-6 text-rose-700/75">
            Switch to the admin role to edit shared game content.
          </p>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      eyebrow="Admin"
      title="Games Content"
      description="Edit the questions, prompts, emojis, words, and phrases used by the games without changing code or redeploying."
      action={
        <Button variant="ghost" onClick={() => navigate("/games")}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      }
    >
      <Card className="bg-gradient-to-br from-rose-50 to-pink-50">
        <div className="flex items-start gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-rose-500 text-white">
            <SlidersHorizontal className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-rose-950">
              Shared game content
            </h2>
            <p className="mt-1 text-sm leading-6 text-rose-700/75">
              Saves to Firestore at <span className="font-mono">gameContent/default</span>.
              Active games keep their current round state, and new games use the
              latest saved content.
            </p>
            {usingDefaults ? (
              <p className="mt-3 rounded-2xl bg-white/70 px-3 py-2 text-xs font-bold text-rose-500">
                No saved content document yet. You are editing the built-in
                defaults; save once to create it.
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      {loading ? (
        <p className="rounded-3xl bg-white/70 p-4 text-sm font-semibold text-rose-700">
          Loading game content...
        </p>
      ) : null}

      {error ? (
        <p className="rounded-3xl bg-white/70 p-4 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="grid gap-4">
        <EditableSection
          title="Love Quiz"
          description="Questions one partner picks before entering their secret answer."
          label="One question per line"
          value={form.loveQuizQuestions}
          placeholder="What's my favorite food?"
          onChange={(value) => updateField("loveQuizQuestions", value)}
        />

        <EditableSection
          title="Would You Rather"
          description="Use one pair per line. Separate the two choices with a pipe."
          label="Format: Option A | Option B"
          value={form.wouldYouRatherQuestions}
          placeholder="Live in a treehouse | Live in a houseboat"
          onChange={(value) => updateField("wouldYouRatherQuestions", value)}
        />

        <EditableSection
          title="Truths"
          description="Truth prompts for Truth or Dare."
          label="One truth per line"
          value={form.truths}
          placeholder="What was your first impression of me?"
          onChange={(value) => updateField("truths", value)}
        />

        <EditableSection
          title="Dares"
          description="Dare prompts for Truth or Dare."
          label="One dare per line"
          value={form.dares}
          placeholder="Give me three genuine compliments"
          onChange={(value) => updateField("dares", value)}
        />

        <EditableSection
          title="Word Guess"
          description="Suggestion chips for the person setting the secret word."
          label="One 3-6 letter word per line"
          value={form.wordGuessWords}
          rows={5}
          placeholder="HEART"
          onChange={(value) => updateField("wordGuessWords", value)}
        />

        <EditableSection
          title="Memory Match"
          description="Emoji pool used to build the matching card deck. Add at least 8."
          label="One emoji per line"
          value={form.coupleEmojis}
          rows={5}
          placeholder="💕"
          onChange={(value) => updateField("coupleEmojis", value)}
        />

        <EditableSection
          title="Typing Race"
          description="Phrases players race to type."
          label="One phrase per line"
          value={form.typingPhrases}
          placeholder="I love you more than words can say"
          onChange={(value) => updateField("typingPhrases", value)}
        />

        <div className="sticky bottom-24 z-10 grid gap-3 rounded-[2rem] bg-white/80 p-3 shadow-xl shadow-rose-100 backdrop-blur sm:grid-cols-[1fr_auto]">
          <Button type="submit" disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving..." : "Save Game Content"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={resetDefaults}
            disabled={saving}
          >
            <RotateCcw className="size-4" />
            Reset Defaults
          </Button>
        </div>
      </form>
    </Page>
  );
}
