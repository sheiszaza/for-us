import { useState } from "react";
import { motion } from "framer-motion";
import type { Role } from "../../types";
import { Button } from "../Button";
import type { GameComponentProps } from "./types";

const CODE_PIECES = ["❤", "★", "●", "◆", "☀", "☾"];
const CODE_LENGTH = 4;

const scoreGuess = (guess: number[], secret: number[]) => {
  let exact = 0;
  const remainingGuess: number[] = [];
  const remainingSecret: number[] = [];

  for (let index = 0; index < CODE_LENGTH; index++) {
    if (guess[index] === secret[index]) {
      exact += 1;
    } else {
      remainingGuess.push(guess[index]);
      remainingSecret.push(secret[index]);
    }
  }

  let close = 0;
  const availableSecret = [...remainingSecret];
  for (const piece of remainingGuess) {
    const matchIndex = availableSecret.indexOf(piece);
    if (matchIndex !== -1) {
      close += 1;
      availableSecret.splice(matchIndex, 1);
    }
  }

  return { exact, close };
};

export function CodeBreakerGame({
  game,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.codeBreaker;
  const [draft, setDraft] = useState<number[]>([]);

  if (!state) return null;

  const isMyTurn = state.currentTurn === role;
  const guessesLeft = state.maxGuesses - state.guesses.length;

  const handlePieceTap = (pieceIndex: number) => {
    if (!isMyTurn || state.winner || draft.length >= CODE_LENGTH) return;
    setDraft((current) => [...current, pieceIndex]);
  };

  const handleBackspace = () => {
    setDraft((current) => current.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!role || !isMyTurn || state.winner || draft.length !== CODE_LENGTH) {
      return;
    }

    const result = scoreGuess(draft, state.secret);
    const guesses = [...state.guesses, { by: role, code: draft, ...result }];
    const winner =
      result.exact === CODE_LENGTH
        ? role
        : guesses.length >= state.maxGuesses
        ? "draw"
        : null;

    await updateGameState({
      codeBreaker: {
        ...state,
        guesses,
        currentTurn: role === "me" ? "her" : "me",
        winner,
      },
    });

    setDraft([]);

    if (winner) {
      setTimeout(() => endGame(winner), 2200);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="w-full rounded-3xl bg-gradient-to-br from-indigo-50 to-rose-50 p-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-rose-400">
          Secret Code
        </p>
        <div className="mt-3 flex justify-center gap-2">
          {state.secret.map((piece, index) => (
            <div
              key={`${piece}-${index}`}
              className="grid size-12 place-items-center rounded-2xl bg-rose-950 text-2xl text-white shadow"
            >
              {state.winner ? CODE_PIECES[piece] : "?"}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-rose-500">
          Exact means right piece in the right spot. Close means right piece,
          wrong spot.
        </p>
      </div>

      <div className="grid w-full grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-rose-50 p-3">
          <p className="text-sm font-bold text-rose-600">{getNickname("me")}</p>
          <p className="text-xs text-rose-400">
            {state.guesses.filter((guess) => guess.by === "me").length} guesses
          </p>
        </div>
        <div className="rounded-2xl bg-white/70 p-3">
          <p className="text-lg font-black text-rose-300">{guessesLeft}</p>
          <p className="text-xs text-rose-400">left</p>
        </div>
        <div className="rounded-2xl bg-fuchsia-50 p-3">
          <p className="text-sm font-bold text-fuchsia-600">
            {getNickname("her")}
          </p>
          <p className="text-xs text-fuchsia-400">
            {state.guesses.filter((guess) => guess.by === "her").length} guesses
          </p>
        </div>
      </div>

      {state.winner ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full rounded-3xl bg-white/80 p-5 text-center"
        >
          <p className="text-4xl">{state.winner === "draw" ? "🤝" : "🏆"}</p>
          <p className="mt-2 text-xl font-black text-rose-950">
            {state.winner === "draw"
              ? "Nobody cracked the code."
              : `${getNickname(state.winner)} broke the code!`}
          </p>
        </motion.div>
      ) : (
        <>
          <p
            className={`text-center font-bold ${
              isMyTurn ? "text-rose-600" : "text-rose-400"
            }`}
          >
            {isMyTurn
              ? "Build a four-symbol guess."
              : `Waiting for ${getNickname(state.currentTurn)}...`}
          </p>

          <div className="flex justify-center gap-2">
            {Array.from({ length: CODE_LENGTH }).map((_, index) => (
              <div
                key={index}
                className="grid size-12 place-items-center rounded-2xl bg-rose-50 text-2xl shadow-inner"
              >
                {draft[index] !== undefined ? CODE_PIECES[draft[index]] : ""}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {CODE_PIECES.map((piece, index) => (
              <motion.button
                key={piece}
                whileHover={isMyTurn ? { scale: 1.05 } : {}}
                whileTap={isMyTurn ? { scale: 0.95 } : {}}
                onClick={() => handlePieceTap(index)}
                disabled={!isMyTurn || draft.length >= CODE_LENGTH}
                className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 text-3xl text-white shadow-lg disabled:opacity-50"
              >
                {piece}
              </motion.button>
            ))}
          </div>

          <div className="flex w-full gap-3">
            <Button
              variant="secondary"
              onClick={handleBackspace}
              disabled={!isMyTurn || draft.length === 0}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isMyTurn || draft.length !== CODE_LENGTH}
              className="flex-1"
            >
              Guess
            </Button>
          </div>
        </>
      )}

      <div className="w-full space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-rose-400">
          Guess Log
        </p>
        {state.guesses.length === 0 ? (
          <p className="rounded-2xl bg-rose-50 p-4 text-center text-sm text-rose-400">
            No guesses yet.
          </p>
        ) : (
          state.guesses
            .slice()
            .reverse()
            .map((guess, index) => (
              <div
                key={`${guess.by}-${index}`}
                className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 shadow-sm"
              >
                <div className="flex gap-1">
                  {guess.code.map((piece, pieceIndex) => (
                    <span key={`${piece}-${pieceIndex}`} className="text-xl">
                      {CODE_PIECES[piece]}
                    </span>
                  ))}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-rose-600">
                    {getNickname(guess.by)}
                  </p>
                </div>
                <div className="text-right text-xs font-bold text-rose-500">
                  <p>{guess.exact} exact</p>
                  <p>{guess.close} close</p>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
