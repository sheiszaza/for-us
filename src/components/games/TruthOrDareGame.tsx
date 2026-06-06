import { motion } from "framer-motion";
import { HelpCircle, Flame, Check } from "lucide-react";
import type { Role } from "../../types";
import { Button } from "../Button";
import { TRUTHS, DARES } from "./constants";
import type { GameComponentProps } from "./types";

export function TruthOrDareGame({
  game,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.truthOrDare;
  if (!state) return null;

  const isMyTurn = state.currentTurn === role;
  const partnerRole: Role = role === "me" ? "her" : "me";

  const handleChoice = async (type: "truth" | "dare") => {
    const options = type === "truth" ? TRUTHS : DARES;
    const randomChallenge = options[Math.floor(Math.random() * options.length)];

    await updateGameState({
      truthOrDare: {
        ...state,
        currentChallenge: { type, text: randomChallenge },
      },
    });
  };

  const handleComplete = async () => {
    if (!state.currentChallenge || !role) return;

    await updateGameState({
      truthOrDare: {
        ...state,
        currentChallenge: null,
        currentTurn: state.currentTurn === "me" ? "her" : "me",
        history: [
          ...state.history,
          { ...state.currentChallenge, completedBy: state.currentTurn },
        ],
      },
    });
  };

  const handleSkip = async () => {
    await updateGameState({
      truthOrDare: {
        ...state,
        currentChallenge: null,
        currentTurn: state.currentTurn === "me" ? "her" : "me",
      },
    });
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-rose-400">Round {state.history.length + 1}</p>

      {!state.currentChallenge ? (
        <>
          <p className="text-center text-lg font-bold text-rose-950">
            {isMyTurn
              ? "Choose your fate!"
              : `${getNickname(state.currentTurn)} is choosing...`}
          </p>

          {isMyTurn && (
            <div className="grid w-full grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleChoice("truth")}
                className="rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 p-6 text-white shadow-lg"
              >
                <HelpCircle className="mx-auto mb-2 size-10" />
                <p className="text-xl font-black">Truth</p>
                <p className="mt-1 text-xs opacity-80">Answer honestly</p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleChoice("dare")}
                className="rounded-2xl bg-gradient-to-br from-red-400 to-rose-500 p-6 text-white shadow-lg"
              >
                <Flame className="mx-auto mb-2 size-10" />
                <p className="text-xl font-black">Dare</p>
                <p className="mt-1 text-xs opacity-80">Complete a challenge</p>
              </motion.button>
            </div>
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full space-y-4 text-center"
        >
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white ${
              state.currentChallenge.type === "truth"
                ? "bg-indigo-500"
                : "bg-rose-500"
            }`}
          >
            {state.currentChallenge.type === "truth" ? (
              <HelpCircle className="size-4" />
            ) : (
              <Flame className="size-4" />
            )}
            {state.currentChallenge.type.toUpperCase()}
          </div>

          <p className="text-xl font-bold text-rose-950">
            {state.currentChallenge.text}
          </p>

          <p className="text-sm text-rose-500">
            For {getNickname(state.currentTurn)}
          </p>

          {isMyTurn && (
            <div className="flex gap-3">
              <Button onClick={handleComplete} className="flex-1">
                <Check className="size-4" />
                Done!
              </Button>
              <Button variant="ghost" onClick={handleSkip}>
                Skip
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {state.history.length > 0 && (
        <div className="w-full">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-rose-400">
            History
          </p>
          <div className="max-h-32 space-y-2 overflow-y-auto">
            {state.history
              .slice()
              .reverse()
              .map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl bg-rose-50 p-2 text-sm"
                >
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${
                      entry.type === "truth" ? "bg-indigo-400" : "bg-rose-400"
                    }`}
                  >
                    {entry.type}
                  </span>
                  <span className="flex-1 truncate text-rose-700">
                    {entry.text}
                  </span>
                  <span className="text-xs text-rose-400">
                    {getNickname(entry.completedBy)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      <Button variant="secondary" onClick={() => endGame()} className="w-full">
        End Game
      </Button>
    </div>
  );
}
