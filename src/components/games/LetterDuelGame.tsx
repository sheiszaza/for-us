import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import type { Role } from "../../types";
import { Button } from "../Button";
import type { GameComponentProps } from "./types";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const MIN_WORD_LENGTH = 3;

const getPartnerRole = (role: Role): Role => (role === "me" ? "her" : "me");

const normalizeWord = (value: string) =>
  value.replace(/[^A-Za-z]/g, "").toUpperCase();

const containsRequiredLetters = (
  word: string,
  firstLetter: string,
  secondLetter: string
) => word.includes(firstLetter) && word.includes(secondLetter);

export function LetterDuelGame({
  game,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.letterDuel;
  const [draftLetter, setDraftLetter] = useState("");
  const [word, setWord] = useState("");

  if (!state) return null;

  const isPicking = state.phase === "selecting";
  const isRacing = state.phase === "racing";
  const isMyTurn = role === state.currentTurn;
  const myLockedLetter = role ? state.selectedLetters[role] : null;
  const firstLetter = state.selectedLetters.me;
  const secondLetter = state.selectedLetters.her;

  const handleConfirmLetter = async () => {
    if (!role || !isPicking || !isMyTurn || !draftLetter) return;

    const selectedLetters = {
      ...state.selectedLetters,
      [role]: draftLetter,
    };
    const partnerRole = getPartnerRole(role);
    const bothSelected = Boolean(selectedLetters.me && selectedLetters.her);

    await updateGameState({
      letterDuel: {
        ...state,
        selectedLetters,
        currentTurn: bothSelected ? state.currentTurn : partnerRole,
        phase: bothSelected ? "racing" : "selecting",
      },
    });

    setDraftLetter("");
  };

  const handleWordChange = (value: string) => {
    setWord(normalizeWord(value));
  };

  const handleSubmitWord = async () => {
    if (!role || !isRacing || state.winner || !firstLetter || !secondLetter) {
      return;
    }

    const candidate = normalizeWord(word);
    if (candidate.length < MIN_WORD_LENGTH) {
      toast.error(`Word must be at least ${MIN_WORD_LENGTH} letters`);
      return;
    }

    if (!containsRequiredLetters(candidate, firstLetter, secondLetter)) {
      toast.error(`Use both ${firstLetter} and ${secondLetter}`);
      return;
    }

    await updateGameState({
      letterDuel: {
        ...state,
        phase: "finished",
        winner: role,
        winningWord: candidate,
      },
    });

    setWord("");
    setTimeout(() => endGame(role), 2000);
  };

  const getLockedLabel = (playerRole: Role) => {
    if (state.phase !== "selecting") {
      return state.selectedLetters[playerRole] ?? "?";
    }

    if (state.selectedLetters[playerRole]) {
      return "✓";
    }

    return "?";
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="grid w-full grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-rose-50 p-3">
          <p className="text-sm font-bold text-rose-600">{getNickname("me")}</p>
          <div className="mx-auto mt-2 grid size-12 place-items-center rounded-2xl bg-white text-2xl font-black text-rose-500 shadow-inner">
            {getLockedLabel("me")}
          </div>
        </div>
        <div className="rounded-2xl bg-white/70 p-3">
          <p className="text-lg font-black text-rose-300">VS</p>
          <p className="mt-1 text-xs font-bold text-rose-400">
            {isPicking ? "Pick letters" : "Word race"}
          </p>
        </div>
        <div className="rounded-2xl bg-fuchsia-50 p-3">
          <p className="text-sm font-bold text-fuchsia-600">
            {getNickname("her")}
          </p>
          <div className="mx-auto mt-2 grid size-12 place-items-center rounded-2xl bg-white text-2xl font-black text-fuchsia-500 shadow-inner">
            {getLockedLabel("her")}
          </div>
        </div>
      </div>

      {isPicking ? (
        <div className="w-full space-y-4 text-center">
          <div className="rounded-3xl bg-gradient-to-br from-sky-50 to-rose-50 p-5">
            <p className="text-xl font-black text-rose-950">
              {isMyTurn
                ? "Choose your secret letter"
                : `Waiting for ${getNickname(state.currentTurn)} to choose`}
            </p>
            <p className="mt-2 text-sm text-rose-500">
              Letters stay hidden until both of you confirm.
            </p>
          </div>

          {myLockedLetter ? (
            <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-500">
              Your letter is locked. Get ready for the word race.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-7">
                {LETTERS.map((letter) => {
                  const selected = draftLetter === letter;
                  return (
                    <motion.button
                      key={letter}
                      whileTap={isMyTurn ? { scale: 0.93 } : {}}
                      onClick={() => setDraftLetter(letter)}
                      disabled={!role || !isMyTurn}
                      className={`grid aspect-square place-items-center rounded-2xl text-lg font-black shadow-sm transition disabled:opacity-45 ${
                        selected
                          ? "bg-cyan-500 text-white"
                          : "bg-white text-rose-700 ring-1 ring-rose-100"
                      }`}
                    >
                      {letter}
                    </motion.button>
                  );
                })}
              </div>

              <Button
                onClick={handleConfirmLetter}
                disabled={!role || !isMyTurn || !draftLetter}
                className="w-full"
              >
                Confirm Letter
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="w-full space-y-5 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-3xl bg-gradient-to-br from-cyan-50 to-rose-50 p-5"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Required Letters
            </p>
            <div className="mt-3 flex justify-center gap-3">
              {[firstLetter, secondLetter].map((letter, index) => (
                <div
                  key={`${letter}-${index}`}
                  className="grid size-16 place-items-center rounded-2xl bg-rose-950 text-3xl font-black text-white shadow-lg"
                >
                  {letter}
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm font-semibold text-rose-600">
              First word containing both letters wins.
            </p>
          </motion.div>

          {state.winner ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-3xl bg-white/80 p-5"
            >
              <p className="text-5xl">🏆</p>
              <p className="mt-2 text-xl font-black text-rose-950">
                {getNickname(state.winner)} wins!
              </p>
              <p className="mt-1 text-sm font-bold text-rose-500">
                Winning word: {state.winningWord}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={word}
                onChange={(event) => handleWordChange(event.target.value)}
                placeholder="Type your word"
                disabled={!role}
                className="w-full rounded-xl bg-rose-50 px-4 py-3 text-center text-xl font-bold uppercase tracking-widest text-rose-950 placeholder:text-rose-300 disabled:opacity-55"
              />
              <Button
                onClick={handleSubmitWord}
                disabled={!role || word.length < MIN_WORD_LENGTH}
                className="w-full"
              >
                Submit Word
              </Button>
              <p className="text-xs text-rose-400">
                Only letters count, minimum {MIN_WORD_LENGTH} letters.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
