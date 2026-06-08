import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import type { Role } from "../../types";
import { Button } from "../Button";
import type { GameComponentProps } from "./types";

const MIN_WORD_LENGTH = 2;
const MAX_WORD_LENGTH = 24;
const END_GAME_COUNTDOWN_SECONDS = 5;

const getPartnerRole = (role: Role): Role => (role === "me" ? "her" : "me");

const normalizeWord = (value: string) =>
  value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, MAX_WORD_LENGTH);

export function MindMatchGame({
  game,
  role,
  getNickname,
  updateGameState,
  updateGameFields,
  endGame,
}: GameComponentProps) {
  const state = game.state.mindMatch;
  const [draftWord, setDraftWord] = useState("");
  const [endCountdown, setEndCountdown] = useState(END_GAME_COUNTDOWN_SECONDS);
  const revealedRoundRef = useRef("");
  const advancingRef = useRef(false);
  const endedRef = useRef(false);

  const revealKey = state
    ? `${state.round}:${state.choices.me ?? ""}:${state.choices.her ?? ""}`
    : "";

  useEffect(() => {
    if (
      !state ||
      state.showResult ||
      !state.choices.me ||
      !state.choices.her ||
      revealedRoundRef.current === revealKey
    ) {
      return;
    }

    revealedRoundRef.current = revealKey;
    const matched = state.choices.me === state.choices.her;

    void updateGameState({
      mindMatch: {
        ...state,
        rounds: [
          ...state.rounds,
          {
            round: state.round,
            meWord: state.choices.me,
            herWord: state.choices.her,
            matched,
          },
        ],
        showResult: true,
        matched,
        winningWord: matched ? state.choices.me : null,
      },
    });
  }, [revealKey, state, updateGameState]);

  useEffect(() => {
    if (!state?.showResult || !state.matched || endedRef.current) return;

    endedRef.current = true;
    setEndCountdown(END_GAME_COUNTDOWN_SECONDS);
    const intervalId = window.setInterval(() => {
      setEndCountdown((currentCount) => Math.max(0, currentCount - 1));
    }, 1000);
    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      void endGame("draw");
    }, END_GAME_COUNTDOWN_SECONDS * 1000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [endGame, state?.matched, state?.showResult]);

  if (!state) return null;

  const partnerRole = role ? getPartnerRole(role) : null;
  const myWord = role ? state.choices[role] : null;
  const partnerSubmitted = partnerRole ? Boolean(state.choices[partnerRole]) : false;
  const bothSubmitted = Boolean(state.choices.me && state.choices.her);
  const canSubmit = Boolean(role && !myWord && !state.showResult);
  const recentRounds = state.rounds.slice(-4).reverse();

  const handleWordChange = (value: string) => {
    setDraftWord(normalizeWord(value));
  };

  const handleSubmitWord = async () => {
    if (!role || !canSubmit) return;

    const word = normalizeWord(draftWord);
    if (word.length < MIN_WORD_LENGTH) {
      toast.error(`Word must be at least ${MIN_WORD_LENGTH} letters`);
      return;
    }

    await updateGameFields({
      [`state.mindMatch.choices.${role}`]: word,
    });
    setDraftWord("");
  };

  const handleNextRound = async () => {
    if (advancingRef.current || state.matched) return;

    advancingRef.current = true;
    await updateGameState({
      mindMatch: {
        ...state,
        choices: { me: null, her: null },
        round: state.round + 1,
        showResult: false,
        matched: false,
        winningWord: null,
      },
    });
    advancingRef.current = false;
    setDraftWord("");
  };

  const getDisplayWord = (playerRole: Role) => {
    const submittedWord = state.choices[playerRole];

    if (state.showResult) return submittedWord ?? "?";
    if (!submittedWord) return "Waiting";
    if (playerRole === role) return submittedWord;
    return "Locked";
  };

  const getStatusText = () => {
    if (state.showResult) {
      return state.matched
        ? "You matched. You both win!"
        : "Not the same yet. Try another round.";
    }

    if (bothSubmitted) return "Both words are locked. Revealing...";
    if (myWord && partnerRole) {
      return `Waiting for ${getNickname(partnerRole)} to lock a word...`;
    }

    return "Write the word you think your partner is thinking about.";
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="grid w-full grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-rose-50 p-3">
          <p className="text-sm font-bold text-rose-600">{getNickname("me")}</p>
          <div className="mt-2 min-h-12 rounded-2xl bg-white px-2 py-3 text-lg font-black text-rose-500 shadow-inner">
            {getDisplayWord("me")}
          </div>
        </div>
        <div className="rounded-2xl bg-white/70 p-3">
          <p className="text-2xl font-black text-rose-300">∞</p>
          <p className="mt-1 text-xs font-bold text-rose-400">
            Round {state.round}
          </p>
        </div>
        <div className="rounded-2xl bg-fuchsia-50 p-3">
          <p className="text-sm font-bold text-fuchsia-600">
            {getNickname("her")}
          </p>
          <div className="mt-2 min-h-12 rounded-2xl bg-white px-2 py-3 text-lg font-black text-fuchsia-500 shadow-inner">
            {getDisplayWord("her")}
          </div>
        </div>
      </div>

      <motion.div
        key={`${state.round}-${state.showResult ? "result" : "guess"}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full rounded-3xl p-5 text-center ${
          state.showResult && state.matched
            ? "bg-gradient-to-br from-emerald-50 to-teal-50"
            : "bg-gradient-to-br from-pink-50 to-fuchsia-50"
        }`}
      >
        <p className="text-4xl">
          {state.showResult ? (state.matched ? "🎉" : "💭") : "🤫"}
        </p>
        <p className="mt-3 text-xl font-black text-rose-950">
          {getStatusText()}
        </p>
        <p className="mt-2 text-sm font-semibold text-rose-500">
          Your partner cannot see your word until both words are locked.
        </p>
      </motion.div>

      {!state.showResult ? (
        <div className="w-full space-y-3">
          <input
            type="text"
            value={myWord ?? draftWord}
            onChange={(event) => handleWordChange(event.target.value)}
            disabled={!canSubmit}
            maxLength={MAX_WORD_LENGTH}
            placeholder="Type your secret word"
            className="w-full rounded-xl bg-rose-50 px-4 py-3 text-center text-xl font-bold uppercase tracking-widest text-rose-950 placeholder:text-rose-300 disabled:opacity-55"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <Button
            onClick={handleSubmitWord}
            disabled={!canSubmit || draftWord.length < MIN_WORD_LENGTH}
            className="w-full"
          >
            Lock Word
          </Button>
          <div className="grid grid-cols-2 gap-3 text-center text-xs font-bold">
            <div className="rounded-2xl bg-rose-50 p-3 text-rose-500">
              {myWord ? "Your word is locked" : "You still need to write"}
            </div>
            <div className="rounded-2xl bg-fuchsia-50 p-3 text-fuchsia-500">
              {partnerSubmitted ? "Partner is ready" : "Partner is thinking"}
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-rose-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-400">
                {getNickname("me")}
              </p>
              <p className="mt-1 text-2xl font-black text-rose-600">
                {state.choices.me}
              </p>
            </div>
            <div className="rounded-2xl bg-fuchsia-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-fuchsia-400">
                {getNickname("her")}
              </p>
              <p className="mt-1 text-2xl font-black text-fuchsia-600">
                {state.choices.her}
              </p>
            </div>
          </div>

          {state.matched ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-3xl bg-emerald-100 p-5 text-center"
            >
              <p className="text-2xl font-black text-emerald-700">
                Same word: {state.winningWord}
              </p>
              <p className="mt-1 text-sm font-bold text-emerald-600">
                Returning to the game list in {endCountdown}...
              </p>
            </motion.div>
          ) : (
            <Button onClick={handleNextRound} className="w-full">
              Try Again
            </Button>
          )}
        </div>
      )}

      {recentRounds.length > 0 ? (
        <div className="w-full space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-400">
            Previous Attempts
          </p>
          {recentRounds.map((round) => (
            <div
              key={round.round}
              className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-sm shadow-sm"
            >
              <span className="font-bold text-rose-500">Round {round.round}</span>
              <span className="font-black text-rose-950">
                {round.meWord} / {round.herWord}
              </span>
              <span>{round.matched ? "✓" : "×"}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
