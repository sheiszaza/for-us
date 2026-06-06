import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import type { Role } from "../../types";
import { Button } from "../Button";
import { shuffleArray } from "./constants";
import type { GameComponentProps } from "./types";

export function WordGuessGame({
  game,
  gameContent,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.wordGuess;
  const [input, setInput] = useState("");

  if (!state) return null;

  const isSetter = state.setBy === role;
  const isGuesser = state.currentTurn === role;
  const partnerRole: Role = role === "me" ? "her" : "me";

  const handleSetWord = async () => {
    if (!input.trim()) {
      toast.error("Enter a word");
      return;
    }

    const word = input.trim().toUpperCase();
    if (word.length < 3 || word.length > 6) {
      toast.error("Word must be 3-6 letters");
      return;
    }

    await updateGameState({
      wordGuess: {
        ...state,
        targetWord: word,
      },
    });
    setInput("");
  };

  const handleGuess = async () => {
    if (!input.trim()) return;

    const guess = input.trim().toUpperCase();
    if (guess.length !== state.targetWord.length) {
      toast.error(`Guess must be ${state.targetWord.length} letters`);
      return;
    }

    const newGuesses = [...state.guesses, { word: guess, by: role! }];
    const won = guess === state.targetWord;
    const lost = newGuesses.length >= 6 && !won;

    await updateGameState({
      wordGuess: {
        ...state,
        guesses: newGuesses,
        won,
        lost,
        currentGuess: "",
      },
    });

    setInput("");

    if (won || lost) {
      setTimeout(() => endGame(won ? role! : state.setBy), 2000);
    }
  };

  const getLetterStatus = (guess: string, index: number) => {
    const target = state.targetWord;
    const letter = guess[index];

    if (letter === target[index]) {
      return "bg-emerald-500 text-white";
    }
    if (target.includes(letter)) {
      return "bg-amber-500 text-white";
    }
    return "bg-gray-300 text-gray-700";
  };

  if (!state.targetWord) {
    return (
      <div className="flex flex-col items-center gap-6">
        {isSetter ? (
          <>
            <p className="text-center font-bold text-rose-700">
              Choose a word for {getNickname(partnerRole)} to guess:
            </p>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="3-6 letters"
              className="w-full rounded-xl bg-rose-50 px-4 py-3 text-center text-xl font-bold uppercase tracking-widest text-rose-950 placeholder:text-rose-300"
            />
            <p className="text-xs text-rose-400">Or pick a suggestion:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {shuffleArray(gameContent.wordGuessWords)
                .slice(0, 4)
                .map((word) => (
                  <button
                    key={word}
                    onClick={() => setInput(word)}
                    className="rounded-full bg-rose-100 px-3 py-1 text-sm font-bold text-rose-700 transition hover:bg-rose-200"
                  >
                    {word}
                  </button>
                ))}
            </div>
            <Button onClick={handleSetWord} className="w-full">
              Set Word
            </Button>
          </>
        ) : (
          <p className="text-center text-rose-500">
            Waiting for {getNickname(state.setBy)} to set a word...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {(state.won || state.lost) && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <div className="mb-2 text-4xl">{state.won ? "🎉" : "😅"}</div>
          <p className="text-xl font-black text-rose-950">
            {state.won ? "Got it!" : `The word was ${state.targetWord}`}
          </p>
        </motion.div>
      )}

      <div className="w-full space-y-2">
        {state.guesses.map((guess, guessIndex) => (
          <motion.div
            key={guessIndex}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-1"
          >
            {guess.word.split("").map((letter, letterIndex) => (
              <div
                key={letterIndex}
                className={`grid size-10 place-items-center rounded-lg text-lg font-bold sm:size-12 ${getLetterStatus(
                  guess.word,
                  letterIndex
                )}`}
              >
                {letter}
              </div>
            ))}
          </motion.div>
        ))}

        {!state.won && !state.lost && (
          <>
            {Array.from({ length: 6 - state.guesses.length }).map((_, i) => (
              <div key={i} className="flex justify-center gap-1">
                {Array.from({ length: state.targetWord.length }).map((_, j) => (
                  <div
                    key={j}
                    className="grid size-10 place-items-center rounded-lg border-2 border-rose-200 sm:size-12"
                  />
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      {!state.won && !state.lost && (
        <>
          {isGuesser ? (
            <div className="w-full space-y-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                maxLength={state.targetWord.length}
                placeholder={`${state.targetWord.length} letters`}
                className="w-full rounded-xl bg-rose-50 px-4 py-3 text-center text-xl font-bold uppercase tracking-widest text-rose-950 placeholder:text-rose-300"
              />
              <Button onClick={handleGuess} className="w-full">
                Guess
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm text-rose-500">
              {getNickname(state.currentTurn)} is guessing your word...
            </p>
          )}
        </>
      )}

      <div className="mt-2 flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="size-4 rounded bg-emerald-500" />
          <span className="text-rose-600">Correct spot</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-4 rounded bg-amber-500" />
          <span className="text-rose-600">Wrong spot</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-4 rounded bg-gray-300" />
          <span className="text-rose-600">Not in word</span>
        </div>
      </div>
    </div>
  );
}
