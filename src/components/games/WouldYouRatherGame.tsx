import { motion } from "framer-motion";
import type { Role } from "../../types";
import { Button } from "../Button";
import type { GameComponentProps } from "./types";

export function WouldYouRatherGame({
  game,
  gameContent,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.wouldYouRather;
  if (!state || !state.currentQuestion) return null;

  const myChoice = role ? state.choices[role] : undefined;
  const partnerRole: Role = role === "me" ? "her" : "me";
  const partnerChoice = state.choices[partnerRole];
  const bothChose = myChoice && partnerChoice;
  const questions = gameContent.wouldYouRatherQuestions;

  const handleChoice = async (choice: "A" | "B") => {
    if (!role || myChoice) return;

    await updateGameState({
      wouldYouRather: {
        ...state,
        choices: { ...state.choices, [role]: choice },
      },
    });
  };

  const handleNext = async () => {
    if (state.currentIndex >= questions.length - 1) {
      await endGame("draw");
      return;
    }

    await updateGameState({
      wouldYouRather: {
        currentQuestion: questions[state.currentIndex + 1],
        choices: {},
        questionHistory: [
          ...state.questionHistory,
          {
            optionA: state.currentQuestion!.optionA,
            optionB: state.currentQuestion!.optionB,
            meChoice: state.choices.me!,
            herChoice: state.choices.her!,
          },
        ],
        currentIndex: state.currentIndex + 1,
      },
    });
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-rose-400">
        Question {state.currentIndex + 1} / {questions.length}
      </p>

      <p className="text-center text-lg font-bold text-rose-950">
        Would you rather...
      </p>

      <div className="grid w-full gap-4">
        <motion.button
          whileHover={!myChoice ? { scale: 1.02 } : {}}
          whileTap={!myChoice ? { scale: 0.98 } : {}}
          onClick={() => handleChoice("A")}
          disabled={!!myChoice}
          className={`rounded-2xl p-4 text-left transition ${
            bothChose
              ? myChoice === "A" && partnerChoice === "A"
                ? "bg-emerald-100 ring-2 ring-emerald-500"
                : myChoice === "A"
                ? "bg-rose-100 ring-2 ring-rose-500"
                : "bg-rose-50"
              : myChoice === "A"
              ? "bg-rose-500 text-white"
              : "bg-rose-50 hover:bg-rose-100"
          }`}
        >
          <div className="mb-2 text-xs font-bold uppercase tracking-wider opacity-60">
            Option A
          </div>
          <p className="font-bold">{state.currentQuestion.optionA}</p>
          {bothChose && (
            <div className="mt-2 flex gap-2">
              {myChoice === "A" && (
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-rose-500">
                  You
                </span>
              )}
              {partnerChoice === "A" && (
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-pink-500">
                  {getNickname(partnerRole)}
                </span>
              )}
            </div>
          )}
        </motion.button>

        <div className="text-center text-sm font-bold text-rose-300">OR</div>

        <motion.button
          whileHover={!myChoice ? { scale: 1.02 } : {}}
          whileTap={!myChoice ? { scale: 0.98 } : {}}
          onClick={() => handleChoice("B")}
          disabled={!!myChoice}
          className={`rounded-2xl p-4 text-left transition ${
            bothChose
              ? myChoice === "B" && partnerChoice === "B"
                ? "bg-emerald-100 ring-2 ring-emerald-500"
                : myChoice === "B"
                ? "bg-rose-100 ring-2 ring-rose-500"
                : "bg-rose-50"
              : myChoice === "B"
              ? "bg-rose-500 text-white"
              : "bg-rose-50 hover:bg-rose-100"
          }`}
        >
          <div className="mb-2 text-xs font-bold uppercase tracking-wider opacity-60">
            Option B
          </div>
          <p className="font-bold">{state.currentQuestion.optionB}</p>
          {bothChose && (
            <div className="mt-2 flex gap-2">
              {myChoice === "B" && (
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-rose-500">
                  You
                </span>
              )}
              {partnerChoice === "B" && (
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-pink-500">
                  {getNickname(partnerRole)}
                </span>
              )}
            </div>
          )}
        </motion.button>
      </div>

      {myChoice && !partnerChoice && (
        <p className="text-center text-sm text-rose-500">
          Waiting for {getNickname(partnerRole)} to choose...
        </p>
      )}

      {bothChose && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-3 text-center"
        >
          <p className="text-lg font-bold">
            {myChoice === partnerChoice ? (
              <span className="text-emerald-600">
                You both chose the same! 💕
              </span>
            ) : (
              <span className="text-rose-600">Different choices! 🤔</span>
            )}
          </p>
          <Button onClick={handleNext} className="w-full">
            {state.currentIndex >= questions.length - 1
              ? "Finish Game"
              : "Next Question"}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
