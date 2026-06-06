import { motion } from "framer-motion";
import type { Role, SimonSaysState } from "../../types";
import { Button } from "../Button";
import type { GameComponentProps } from "./types";

const PADS = [
  { label: "Rose", emoji: "❤", color: "from-rose-400 to-pink-500" },
  { label: "Sun", emoji: "☀", color: "from-amber-400 to-orange-500" },
  { label: "Leaf", emoji: "◆", color: "from-emerald-400 to-teal-500" },
  { label: "Moon", emoji: "●", color: "from-violet-400 to-purple-500" },
];

const getRandomPad = () => Math.floor(Math.random() * PADS.length);

const hasResolvedRound = (state: SimonSaysState, player: Role) =>
  state.failed[player] || state.finishTimes[player] !== null;

const getRoundWinner = (state: SimonSaysState): Role | "draw" | null => {
  const meResolved = hasResolvedRound(state, "me");
  const herResolved = hasResolvedRound(state, "her");

  if (!meResolved || !herResolved) return null;

  if (state.failed.me && state.failed.her) return "draw";
  if (state.failed.me) return "her";
  if (state.failed.her) return "me";

  const meTime = state.finishTimes.me;
  const herTime = state.finishTimes.her;

  if (meTime === null || herTime === null) return null;
  if (meTime === herTime) return "draw";

  return meTime < herTime ? "me" : "her";
};

const getGameWinner = (scores: { me: number; her: number }) => {
  if (scores.me === scores.her) return "draw";
  return scores.me > scores.her ? "me" : "her";
};

export function SimonSaysGame({
  game,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.simonSays;
  if (!state) return null;

  const partnerRole: Role = role === "me" ? "her" : "me";
  const myInput = role ? state.inputs[role] : [];
  const myResolved = role ? hasResolvedRound(state, role) : false;
  const partnerResolved = hasResolvedRound(state, partnerRole);
  const maxWins = Math.ceil(state.maxRounds / 2);
  const gameOver =
    state.scores.me >= maxWins ||
    state.scores.her >= maxWins ||
    (state.showResult && state.round >= state.maxRounds);

  const handlePadTap = async (padIndex: number) => {
    if (!role || myResolved || state.showResult) return;

    const expectedPad = state.sequence[myInput.length];
    const inputs = {
      ...state.inputs,
      [role]: [...myInput, padIndex],
    };
    const failed = { ...state.failed };
    const finishTimes = { ...state.finishTimes };

    if (padIndex !== expectedPad) {
      failed[role] = true;
    } else if (inputs[role].length === state.sequence.length) {
      finishTimes[role] = Date.now() - state.roundStartedAt;
    }

    const nextState: SimonSaysState = {
      ...state,
      inputs,
      failed,
      finishTimes,
    };
    const roundWinner = getRoundWinner(nextState);

    if (roundWinner) {
      const scores = { ...state.scores };
      if (roundWinner !== "draw") {
        scores[roundWinner] += 1;
      }

      const resultState: SimonSaysState = {
        ...nextState,
        scores,
        roundWinner,
        showResult: true,
      };

      await updateGameState({ simonSays: resultState });

      if (
        scores.me >= maxWins ||
        scores.her >= maxWins ||
        state.round >= state.maxRounds
      ) {
        setTimeout(() => endGame(getGameWinner(scores)), 2500);
      }
      return;
    }

    await updateGameState({ simonSays: nextState });
  };

  const handleNextRound = async () => {
    if (gameOver) {
      await endGame(getGameWinner(state.scores));
      return;
    }

    await updateGameState({
      simonSays: {
        ...state,
        sequence: [...state.sequence, getRandomPad()],
        inputs: { me: [], her: [] },
        failed: { me: false, her: false },
        finishTimes: { me: null, her: null },
        round: state.round + 1,
        roundStartedAt: Date.now(),
        roundWinner: null,
        showResult: false,
      },
    });
  };

  const getPlayerStatus = (player: Role) => {
    if (state.failed[player]) return "Missed";
    if (state.finishTimes[player] !== null) return `${state.finishTimes[player]}ms`;
    return `${state.inputs[player].length}/${state.sequence.length}`;
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="grid w-full grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-rose-50 p-3">
          <p className="text-3xl font-black text-rose-500">{state.scores.me}</p>
          <p className="text-xs font-bold text-rose-500">{getNickname("me")}</p>
          <p className="text-[0.65rem] text-rose-400">{getPlayerStatus("me")}</p>
        </div>
        <div className="rounded-2xl bg-white/70 p-3">
          <p className="text-lg font-black text-rose-300">ROUND</p>
          <p className="text-sm font-bold text-rose-500">
            {state.round}/{state.maxRounds}
          </p>
        </div>
        <div className="rounded-2xl bg-fuchsia-50 p-3">
          <p className="text-3xl font-black text-fuchsia-500">
            {state.scores.her}
          </p>
          <p className="text-xs font-bold text-fuchsia-500">
            {getNickname("her")}
          </p>
          <p className="text-[0.65rem] text-fuchsia-400">
            {getPlayerStatus("her")}
          </p>
        </div>
      </div>

      {state.showResult ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full space-y-4 text-center"
        >
          <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-rose-50 p-5">
            <p className="text-4xl">{state.roundWinner === "draw" ? "🤝" : "🏆"}</p>
            <p className="mt-2 text-xl font-black text-rose-950">
              {state.roundWinner === "draw"
                ? "Nobody takes this round."
                : `${getNickname(state.roundWinner!)} wins the pattern!`}
            </p>
          </div>

          {!gameOver ? (
            <Button onClick={handleNextRound} className="w-full">
              Next Pattern
            </Button>
          ) : (
            <p className="text-2xl font-black text-rose-950">
              {state.scores.me === state.scores.her
                ? "Final result: draw!"
                : `Final winner: ${getNickname(
                    state.scores.me > state.scores.her ? "me" : "her"
                  )}!`}
            </p>
          )}
        </motion.div>
      ) : (
        <>
          <div className="w-full rounded-3xl bg-gradient-to-br from-rose-50 to-violet-50 p-4">
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-rose-400">
              Memorize this sequence
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {state.sequence.map((padIndex, index) => (
                <motion.div
                  key={`${padIndex}-${index}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.08 }}
                  className={`grid size-10 place-items-center rounded-2xl bg-gradient-to-br ${PADS[padIndex].color} text-xl font-black text-white shadow`}
                >
                  {PADS[padIndex].emoji}
                </motion.div>
              ))}
            </div>
          </div>

          <p
            className={`text-center font-bold ${
              myResolved ? "text-rose-400" : "text-rose-600"
            }`}
          >
            {myResolved
              ? `Waiting for ${getNickname(partnerRole)}...`
              : "Repeat the sequence without a mistake."}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {PADS.map((pad, index) => (
              <motion.button
                key={pad.label}
                whileHover={!myResolved ? { scale: 1.04 } : {}}
                whileTap={!myResolved ? { scale: 0.95 } : {}}
                onClick={() => handlePadTap(index)}
                disabled={myResolved}
                className={`flex size-28 flex-col items-center justify-center gap-2 rounded-3xl bg-gradient-to-br ${pad.color} text-white shadow-lg transition disabled:opacity-60 sm:size-32`}
              >
                <span className="text-4xl">{pad.emoji}</span>
                <span className="text-xs font-black uppercase tracking-wider">
                  {pad.label}
                </span>
              </motion.button>
            ))}
          </div>

          {partnerResolved ? (
            <p className="rounded-xl bg-white/70 px-4 py-2 text-sm font-bold text-rose-500">
              {getNickname(partnerRole)} finished. Keep going!
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
