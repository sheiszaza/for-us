import { motion } from "framer-motion";
import type { Role, RockPaperScissorsChoice } from "../../types";
import { Button } from "../Button";
import { RPS_OPTIONS } from "./constants";
import type { GameComponentProps } from "./types";

export function RockPaperScissorsGame({
  game,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.rockPaperScissors;
  if (!state) return null;

  const myChoice = role ? state.choices[role] : null;
  const partnerRole: Role = role === "me" ? "her" : "me";
  const partnerChoice = state.choices[partnerRole];
  const bothChose = myChoice && partnerChoice;

  const getWinner = (
    choice1: RockPaperScissorsChoice,
    choice2: RockPaperScissorsChoice
  ): "me" | "her" | "draw" | null => {
    if (!choice1 || !choice2) return null;
    if (choice1 === choice2) return "draw";
    const option1 = RPS_OPTIONS.find((o) => o.choice === choice1);
    if (option1?.beats === choice2) return "me";
    return "her";
  };

  const handleChoice = async (choice: RockPaperScissorsChoice) => {
    if (!role || myChoice || !choice) return;

    const newChoices = { ...state.choices, [role]: choice };

    await updateGameState({
      rockPaperScissors: {
        ...state,
        choices: newChoices,
      },
    });

    const otherChoice = newChoices[partnerRole];
    if (otherChoice) {
      setTimeout(async () => {
        const winner = getWinner(
          role === "me" ? choice : otherChoice,
          role === "me" ? otherChoice : choice
        );

        const newScores = { ...state.scores };
        if (winner === "me") newScores.me += 1;
        else if (winner === "her") newScores.her += 1;

        await updateGameState({
          rockPaperScissors: {
            ...state,
            choices: newChoices,
            scores: newScores,
            roundWinner: winner,
            showResult: true,
          },
        });

        const maxWins = Math.ceil(state.maxRounds / 2);
        if (newScores.me >= maxWins || newScores.her >= maxWins) {
          setTimeout(() => {
            endGame(newScores.me > newScores.her ? "me" : "her");
          }, 2000);
        }
      }, 500);
    }
  };

  const handleNextRound = async () => {
    if (state.round >= state.maxRounds) {
      const winner =
        state.scores.me > state.scores.her
          ? "me"
          : state.scores.her > state.scores.me
          ? "her"
          : "draw";
      await endGame(winner);
      return;
    }

    await updateGameState({
      rockPaperScissors: {
        ...state,
        choices: { me: null, her: null },
        round: state.round + 1,
        roundWinner: null,
        showResult: false,
      },
    });
  };

  const maxWins = Math.ceil(state.maxRounds / 2);
  const gameOver = state.scores.me >= maxWins || state.scores.her >= maxWins;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-4 text-center">
        <div
          className={`rounded-2xl px-5 py-3 ${
            state.scores.me > state.scores.her
              ? "bg-rose-500 text-white"
              : "bg-rose-100"
          }`}
        >
          <p
            className={`text-3xl font-black ${
              state.scores.me > state.scores.her ? "text-white" : "text-rose-500"
            }`}
          >
            {state.scores.me}
          </p>
          <p
            className={`text-xs font-bold ${
              state.scores.me > state.scores.her
                ? "text-white/80"
                : "text-rose-400"
            }`}
          >
            {getNickname("me")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-rose-300">VS</p>
          <p className="text-xs text-rose-400">
            Round {state.round}/{state.maxRounds}
          </p>
        </div>
        <div
          className={`rounded-2xl px-5 py-3 ${
            state.scores.her > state.scores.me
              ? "bg-fuchsia-500 text-white"
              : "bg-fuchsia-100"
          }`}
        >
          <p
            className={`text-3xl font-black ${
              state.scores.her > state.scores.me
                ? "text-white"
                : "text-fuchsia-500"
            }`}
          >
            {state.scores.her}
          </p>
          <p
            className={`text-xs font-bold ${
              state.scores.her > state.scores.me
                ? "text-white/80"
                : "text-fuchsia-400"
            }`}
          >
            {getNickname("her")}
          </p>
        </div>
      </div>

      {state.showResult && bothChose ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-full space-y-4 text-center"
        >
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-6xl"
              >
                {RPS_OPTIONS.find((o) => o.choice === state.choices.me)?.emoji}
              </motion.div>
              <p className="mt-2 text-sm font-bold text-rose-500">
                {getNickname("me")}
              </p>
            </div>
            <div className="text-2xl font-black text-rose-300">VS</div>
            <div className="text-center">
              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-6xl"
              >
                {RPS_OPTIONS.find((o) => o.choice === state.choices.her)?.emoji}
              </motion.div>
              <p className="mt-2 text-sm font-bold text-fuchsia-500">
                {getNickname("her")}
              </p>
            </div>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`rounded-2xl p-4 ${
              state.roundWinner === "draw"
                ? "bg-gray-100"
                : state.roundWinner === "me"
                ? "bg-rose-100"
                : "bg-fuchsia-100"
            }`}
          >
            <p className="text-xl font-black">
              {state.roundWinner === "draw" ? (
                <span className="text-gray-600">It's a tie! 🤝</span>
              ) : (
                <span
                  className={
                    state.roundWinner === "me"
                      ? "text-rose-600"
                      : "text-fuchsia-600"
                  }
                >
                  {getNickname(state.roundWinner!)} wins! 🎉
                </span>
              )}
            </p>
          </motion.div>

          {!gameOver && (
            <Button onClick={handleNextRound} className="w-full">
              Next Round
            </Button>
          )}

          {gameOver && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="space-y-3"
            >
              <p className="text-2xl font-black text-rose-950">
                🏆 {getNickname(state.scores.me > state.scores.her ? "me" : "her")}{" "}
                wins the game!
              </p>
            </motion.div>
          )}
        </motion.div>
      ) : (
        <>
          <p
            className={`text-center font-bold ${
              myChoice ? "text-rose-400" : "text-rose-600"
            }`}
          >
            {myChoice
              ? `Waiting for ${getNickname(partnerRole)}...`
              : "Make your choice!"}
          </p>

          <div className="grid grid-cols-3 gap-4">
            {RPS_OPTIONS.map((option) => (
              <motion.button
                key={option.choice}
                whileHover={!myChoice ? { scale: 1.05 } : {}}
                whileTap={!myChoice ? { scale: 0.95 } : {}}
                onClick={() => handleChoice(option.choice)}
                disabled={!!myChoice}
                className={`flex flex-col items-center gap-2 rounded-2xl p-4 transition ${
                  myChoice === option.choice
                    ? "bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg"
                    : myChoice
                    ? "bg-gray-100 opacity-50"
                    : "bg-gradient-to-br from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100"
                }`}
              >
                <span className="text-5xl">{option.emoji}</span>
                <span
                  className={`text-sm font-bold ${
                    myChoice === option.choice ? "text-white" : "text-cyan-700"
                  }`}
                >
                  {option.label}
                </span>
              </motion.button>
            ))}
          </div>

          {myChoice && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-rose-400"
            >
              You chose{" "}
              {RPS_OPTIONS.find((o) => o.choice === myChoice)?.label}!
            </motion.p>
          )}
        </>
      )}
    </div>
  );
}
