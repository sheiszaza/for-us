import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import type {
  Role,
  StopCategoriesAnswers,
  StopCategoriesCategory,
} from "../../types";
import { Button } from "../Button";
import type { GameComponentProps } from "./types";

type CategoryConfig = {
  key: StopCategoriesCategory;
  label: string;
  placeholder: string;
};

type CategoryScore = Record<Role, number>;

const LETTER_COUNTDOWN_SECONDS = 10;
const REVEAL_INTERVAL_SECONDS = 2;
const MAX_ANSWER_LENGTH = 32;
const MIN_LETTER_COUNT = 3;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const CATEGORIES: CategoryConfig[] = [
  { key: "person", label: "Person", placeholder: "Name of a person" },
  { key: "animal", label: "Animal", placeholder: "Name of an animal" },
  { key: "thing", label: "Thing", placeholder: "Name of a thing" },
  { key: "food", label: "Food", placeholder: "Name of a food" },
  { key: "country", label: "Country", placeholder: "Name of a country" },
];

const getPartnerRole = (role: Role): Role => (role === "me" ? "her" : "me");

const createEmptyAnswers = (): StopCategoriesAnswers => ({
  person: "",
  animal: "",
  thing: "",
  food: "",
  country: "",
});

const normalizeAnswerInput = (value: string) =>
  value
    .replace(/[^A-Za-z0-9\s'-]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, MAX_ANSWER_LENGTH);

const getComparableAnswer = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const getLetterCount = (value: string) =>
  value.replace(/[^A-Za-z]/g, "").length;

const startsWithSelectedLetter = (value: string, letter: string) =>
  getComparableAnswer(value).startsWith(letter.toLowerCase());

const isValidAnswer = (value: string, letter: string) =>
  startsWithSelectedLetter(value, letter) &&
  getLetterCount(value) >= MIN_LETTER_COUNT;

const calculateCategoryScore = (
  answers: Record<Role, StopCategoriesAnswers>,
  category: StopCategoriesCategory,
  letter: string
): CategoryScore => {
  const meAnswer = getComparableAnswer(answers.me[category]);
  const herAnswer = getComparableAnswer(answers.her[category]);
  const meValid = isValidAnswer(answers.me[category], letter);
  const herValid = isValidAnswer(answers.her[category], letter);
  const sameAnswer = meValid && herValid && meAnswer === herAnswer;

  return {
    me: meValid ? (sameAnswer ? 5 : 10) : 0,
    her: herValid ? (sameAnswer ? 5 : 10) : 0,
  };
};

const calculateRoundScores = (
  answers: Record<Role, StopCategoriesAnswers>,
  letter: string
): CategoryScore =>
  CATEGORIES.reduce<CategoryScore>(
    (scores, category) => {
      const categoryScores = calculateCategoryScore(
        answers,
        category.key,
        letter
      );
      return {
        me: scores.me + categoryScores.me,
        her: scores.her + categoryScores.her,
      };
    },
    { me: 0, her: 0 }
  );

function StopCategoriesGameComponent({
  game,
  role,
  getNickname,
  updateGameState,
  updateGameFields,
  endGame,
}: GameComponentProps) {
  const state = game.state.stopCategories;
  const [now, setNow] = useState(Date.now());
  const [localAnswers, setLocalAnswers] =
    useState<StopCategoriesAnswers>(createEmptyAnswers);
  const timeoutKeyRef = useRef("");
  const actionPendingRef = useRef(false);

  useEffect(() => {
    if (!state || state.phase !== "selecting-letter") return;

    setNow(Date.now());
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [state?.phase, state?.letterSelectionStartedAt]);

  useEffect(() => {
    if (!state || !role) return;
    setLocalAnswers(state.answers[role] ?? createEmptyAnswers());
  }, [role, state?.round]);

  const letterTimeRemaining = state
    ? Math.max(
        0,
        Math.ceil(
          (state.letterSelectionStartedAt +
            LETTER_COUNTDOWN_SECONDS * 1000 -
            now) /
            1000
        )
      )
    : 0;

  useEffect(() => {
    if (
      !state ||
      !role ||
      state.phase !== "selecting-letter" ||
      state.currentTurn !== role ||
      letterTimeRemaining > 0
    ) {
      return;
    }

    const timeoutKey = `${state.round}:${state.currentTurn}:${state.letterSelectionStartedAt}`;
    if (timeoutKeyRef.current === timeoutKey) return;
    timeoutKeyRef.current = timeoutKey;

    const nextTurn = getPartnerRole(state.currentTurn);
    toast(`${getNickname(nextTurn)} gets the letter turn now`);
    void updateGameState({
      stopCategories: {
        ...state,
        currentTurn: nextTurn,
        letterSelectionStartedAt: Date.now(),
      },
    });
  }, [getNickname, letterTimeRemaining, role, state, updateGameState]);

  useEffect(() => {
    if (
      !state ||
      !role ||
      state.phase !== "revealing" ||
      state.stoppedBy !== role ||
      state.revealedCategoryIndex >= CATEGORIES.length - 1
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void updateGameFields({
        "state.stopCategories.revealedCategoryIndex":
          state.revealedCategoryIndex + 1,
      });
    }, REVEAL_INTERVAL_SECONDS * 1000);

    return () => window.clearTimeout(timeoutId);
  }, [
    role,
    state?.phase,
    state?.revealedCategoryIndex,
    state?.stoppedBy,
    updateGameFields,
  ]);

  const categoryScores = useMemo(() => {
    if (!state?.letter) return {};

    return CATEGORIES.reduce<
      Partial<Record<StopCategoriesCategory, CategoryScore>>
    >((scores, category) => {
      scores[category.key] = calculateCategoryScore(
        state.answers,
        category.key,
        state.letter ?? ""
      );
      return scores;
    }, {});
  }, [state?.answers, state?.letter]);

  if (!state) return null;

  const partnerRole: Role = role === "me" ? "her" : "me";
  const isMyLetterTurn = role === state.currentTurn;
  const isTyping = state.phase === "typing";
  const myFilledCount = CATEGORIES.filter((category) =>
    localAnswers[category.key].trim()
  ).length;
  const partnerFilledCount = CATEGORIES.filter((category) =>
    state.answers[partnerRole][category.key].trim()
  ).length;
  const usedLetters = new Set(state.rounds.map((round) => round.letter));
  const allFieldsFilled = myFilledCount === CATEGORIES.length;
  const validAnswerCount = state.letter
    ? CATEGORIES.filter((category) =>
        isValidAnswer(localAnswers[category.key], state.letter ?? "")
      ).length
    : 0;
  const allAnswersValid = validAnswerCount === CATEGORIES.length;
  const revealedCategories = CATEGORIES.slice(
    0,
    state.revealedCategoryIndex + 1
  );
  const finalWinner =
    state.scores.me > state.scores.her
      ? "me"
      : state.scores.her > state.scores.me
      ? "her"
      : "draw";

  const handleSelectLetter = async (letter: string) => {
    if (
      !isMyLetterTurn ||
      state.phase !== "selecting-letter" ||
      usedLetters.has(letter)
    ) {
      return;
    }

    timeoutKeyRef.current = `${state.round}:${state.currentTurn}:${state.letterSelectionStartedAt}`;
    await updateGameState({
      stopCategories: {
        ...state,
        letter,
        answers: { me: createEmptyAnswers(), her: createEmptyAnswers() },
        stoppedBy: null,
        roundScores: { me: 0, her: 0 },
        phase: "typing",
        revealedCategoryIndex: 0,
      },
    });
  };

  const handleAnswerChange = useCallback(
    (category: StopCategoriesCategory, value: string) => {
      if (!role || !isTyping) return;

      const answer = normalizeAnswerInput(value);
      setLocalAnswers((currentAnswers) => ({
        ...currentAnswers,
        [category]: answer,
      }));

      void updateGameFields({
        [`state.stopCategories.answers.${role}.${category}`]: answer,
      });
    },
    [isTyping, role, updateGameFields]
  );

  const handleStop = async () => {
    if (
      !role ||
      !state.letter ||
      !allAnswersValid ||
      state.phase !== "typing"
    ) {
      return;
    }

    const answers = {
      ...state.answers,
      [role]: localAnswers,
    };
    const roundScores = calculateRoundScores(answers, state.letter);

    await updateGameState({
      stopCategories: {
        ...state,
        answers,
        stoppedBy: role,
        roundScores,
        scores: {
          me: state.scores.me + roundScores.me,
          her: state.scores.her + roundScores.her,
        },
        phase: "revealing",
        revealedCategoryIndex: 0,
      },
    });
  };

  const handleRevealNext = async () => {
    if (
      !state.letter ||
      state.phase !== "revealing" ||
      actionPendingRef.current
    ) {
      return;
    }

    actionPendingRef.current = true;
    const isLastCategory = state.revealedCategoryIndex >= CATEGORIES.length - 1;

    if (isLastCategory && state.stoppedBy) {
      await updateGameState({
        stopCategories: {
          ...state,
          phase: "round-result",
          rounds: [
            ...state.rounds,
            {
              round: state.round,
              letter: state.letter,
              stoppedBy: state.stoppedBy,
              answers: state.answers,
              scores: state.roundScores,
            },
          ],
        },
      });
    }

    actionPendingRef.current = false;
  };

  const handleNextRound = async () => {
    if (state.phase !== "round-result") return;

    await updateGameState({
      stopCategories: {
        ...state,
        currentTurn: getPartnerRole(state.currentTurn),
        letter: null,
        letterSelectionStartedAt: Date.now(),
        answers: { me: createEmptyAnswers(), her: createEmptyAnswers() },
        stoppedBy: null,
        roundScores: { me: 0, her: 0 },
        round: state.round + 1,
        phase: "selecting-letter",
        revealedCategoryIndex: 0,
      },
    });
    setLocalAnswers(createEmptyAnswers());
  };

  const handleFinishGame = async () => {
    await endGame(finalWinner);
  };

  const renderScoreCard = (playerRole: Role, colorClass: string) => (
    <div className={`rounded-2xl p-3 text-center ${colorClass}`}>
      <p className="text-3xl font-black">{state.scores[playerRole]}</p>
      <p className="text-xs font-bold">{getNickname(playerRole)}</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
        {renderScoreCard("me", "bg-rose-100 text-rose-600")}
        <div className="rounded-2xl bg-white/70 px-4 py-3 text-center shadow-sm">
          <p className="text-2xl font-black text-rose-300">
            {state.letter ?? "?"}
          </p>
          <p className="text-xs font-bold text-rose-400">
            Round {state.round}/{state.maxRounds}
          </p>
        </div>
        {renderScoreCard("her", "bg-fuchsia-100 text-fuchsia-600")}
      </div>

      {state.phase === "selecting-letter" ? (
        <motion.div
          key={`${state.round}-${state.currentTurn}-select`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-4 rounded-3xl bg-gradient-to-br from-sky-50 to-cyan-50 p-5 text-center"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-sky-500">
              Letter Picker
            </p>
            <p className="mt-1 text-xl font-black text-rose-950">
              {isMyLetterTurn
                ? "Choose a letter before time runs out"
                : `${getNickname(state.currentTurn)} is choosing the letter`}
            </p>
            <p className="mt-2 text-5xl font-black text-sky-500">
              {letterTimeRemaining}
            </p>
            <p className="text-xs font-semibold text-sky-500">
              If the countdown ends, the letter turn passes to the other player.
            </p>
          </div>

          <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
            {ALPHABET.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => handleSelectLetter(letter)}
                disabled={!isMyLetterTurn || usedLetters.has(letter)}
                className="rounded-xl bg-white px-2 py-2 text-sm font-black text-sky-600 shadow-sm ring-1 ring-sky-100 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {letter}
              </button>
            ))}
          </div>
        </motion.div>
      ) : null}

      {state.phase === "typing" ? (
        <motion.div
          key={`${state.round}-${state.letter}-typing`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-4"
        >
          <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 p-5 text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-rose-400">
              Starts With
            </p>
            <p className="mt-1 text-6xl font-black text-rose-500">
              {state.letter}
            </p>
            <p className="mt-2 text-sm font-semibold text-rose-500">
              Every answer must start with {state.letter} to unlock Stop.
            </p>
          </div>

          <div className="grid gap-3">
            {CATEGORIES.map((category) => {
              const answer = localAnswers[category.key];
              const hasAnswer = Boolean(answer.trim());
              const startsWithLetter = state.letter
                ? startsWithSelectedLetter(answer, state.letter)
                : false;
              const answerIsValid = state.letter
                ? isValidAnswer(answer, state.letter)
                : false;
              const hasEnoughLetters =
                getLetterCount(answer) >= MIN_LETTER_COUNT;
              const showInvalid = hasAnswer && !answerIsValid;

              return (
                <label key={category.key} className="grid gap-1">
                  <span className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-400">
                    {category.label}
                    {hasAnswer ? (
                      <span
                        className={
                          answerIsValid ? "text-emerald-500" : "text-red-500"
                        }
                      >
                        {answerIsValid
                          ? "Valid"
                          : startsWithLetter
                          ? `At least ${MIN_LETTER_COUNT} letters`
                          : `Must start with ${state.letter}`}
                      </span>
                    ) : null}
                  </span>
                  <input
                    type="text"
                    value={answer}
                    onChange={(event) =>
                      handleAnswerChange(category.key, event.target.value)
                    }
                    maxLength={MAX_ANSWER_LENGTH}
                    placeholder={`${category.placeholder} with ${state.letter}`}
                    className={`w-full rounded-xl bg-white px-4 py-3 font-bold text-rose-950 shadow-inner ring-2 placeholder:text-rose-300 focus:outline-none ${
                      showInvalid
                        ? "ring-red-200 focus:ring-red-300"
                        : "ring-rose-100 focus:ring-rose-300"
                    }`}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                </label>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 text-center text-xs font-bold">
            <div className="rounded-2xl bg-rose-50 p-3 text-rose-500">
              You filled {myFilledCount}/{CATEGORIES.length}
            </div>
            <div className="rounded-2xl bg-fuchsia-50 p-3 text-fuchsia-500">
              Partner filled {partnerFilledCount}/{CATEGORIES.length}
            </div>
          </div>

          <Button
            onClick={handleStop}
            disabled={!allAnswersValid}
            className="w-full"
          >
            {allFieldsFilled ? "Stop" : "Fill All Fields"}
          </Button>
        </motion.div>
      ) : null}

      {state.phase === "revealing" ? (
        <motion.div
          key={`${state.round}-revealing-${state.revealedCategoryIndex}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-4"
        >
          <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-amber-500">
              Stop Called
            </p>
            <p className="mt-1 text-xl font-black text-rose-950">
              {state.stoppedBy
                ? `${getNickname(state.stoppedBy)} stopped the round`
                : "Round stopped"}
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-600">
              {state.revealedCategoryIndex >= CATEGORIES.length - 1
                ? "All fields are revealed. Show the total when you're ready."
                : `Next field reveals every ${REVEAL_INTERVAL_SECONDS} seconds.`}
            </p>
          </div>

          {revealedCategories.map((category) => {
            const scores = categoryScores[category.key] ?? { me: 0, her: 0 };

            return (
              <motion.div
                key={category.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl bg-white/80 p-4 shadow-sm"
              >
                <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-rose-400">
                  {category.label}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-rose-50 p-3 text-center">
                    <p className="text-xs font-bold text-rose-400">
                      {getNickname("me")}
                    </p>
                    <p className="mt-1 min-h-7 font-black text-rose-700">
                      {state.answers.me[category.key] || "-"}
                    </p>
                    <p className="text-xs font-bold text-rose-400">
                      +{scores.me}
                    </p>
                  </div>
                  <div className="rounded-xl bg-fuchsia-50 p-3 text-center">
                    <p className="text-xs font-bold text-fuchsia-400">
                      {getNickname("her")}
                    </p>
                    <p className="mt-1 min-h-7 font-black text-fuchsia-700">
                      {state.answers.her[category.key] || "-"}
                    </p>
                    <p className="text-xs font-bold text-fuchsia-400">
                      +{scores.her}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {state.revealedCategoryIndex >= CATEGORIES.length - 1 ? (
            <Button onClick={handleRevealNext} className="w-full">
              Show Round Total
            </Button>
          ) : (
            <div className="rounded-2xl bg-amber-50 p-3 text-center text-sm font-bold text-amber-600">
              Revealing next field automatically...
            </div>
          )}
        </motion.div>
      ) : null}

      {state.phase === "round-result" ? (
        <motion.div
          key={`${state.round}-result`}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full space-y-4 text-center"
        >
          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-500">
              Round Total
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/80 p-4">
                <p className="text-xs font-bold text-rose-400">
                  {getNickname("me")}
                </p>
                <p className="text-3xl font-black text-rose-600">
                  +{state.roundScores.me}
                </p>
              </div>
              <div className="rounded-2xl bg-white/80 p-4">
                <p className="text-xs font-bold text-fuchsia-400">
                  {getNickname("her")}
                </p>
                <p className="text-3xl font-black text-fuchsia-600">
                  +{state.roundScores.her}
                </p>
              </div>
            </div>
          </div>

          {state.round < state.maxRounds ? (
            <Button onClick={handleNextRound} className="w-full">
              Next Round
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-3xl bg-amber-100 p-5">
                <p className="text-sm font-bold uppercase tracking-wider text-amber-600">
                  Final Winner
                </p>
                <p className="mt-1 text-2xl font-black text-rose-950">
                  {finalWinner === "draw"
                    ? "It's a draw!"
                    : `${getNickname(finalWinner)} wins!`}
                </p>
              </div>
              <Button onClick={handleFinishGame} className="w-full">
                Finish Game
              </Button>
            </div>
          )}
        </motion.div>
      ) : null}
    </div>
  );
}

export const StopCategoriesGame = memo(StopCategoriesGameComponent);
