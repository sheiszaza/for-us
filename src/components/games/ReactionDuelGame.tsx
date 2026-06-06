import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { ReactionDuelState, Role } from "../../types";
import { Button } from "../Button";
import type { GameComponentProps } from "./types";

const getNextReadyAt = () => Date.now() + 1800 + Math.floor(Math.random() * 3200);

const getGameWinner = (scores: { me: number; her: number }) => {
  if (scores.me === scores.her) return "draw";
  return scores.me > scores.her ? "me" : "her";
};

const getReactionTime = (state: ReactionDuelState, player: Role) => {
  const tapTime = state.taps[player];
  if (tapTime === null) return null;
  return Math.max(0, tapTime - state.readyAt);
};

export function ReactionDuelGame({
  game,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.reactionDuel;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 80);
    return () => window.clearInterval(intervalId);
  }, []);

  if (!state) return null;

  const partnerRole: Role = role === "me" ? "her" : "me";
  const isReady = now >= state.readyAt;
  const myTap = role ? state.taps[role] : null;
  const partnerTap = state.taps[partnerRole];
  const maxWins = Math.ceil(state.maxRounds / 2);
  const gameOver =
    state.scores.me >= maxWins ||
    state.scores.her >= maxWins ||
    (state.showResult && state.round >= state.maxRounds);

  const finishRound = async (
    nextState: ReactionDuelState,
    roundWinner: Role | "draw",
    falseStart: Role | null
  ) => {
    const scores = { ...nextState.scores };
    if (roundWinner !== "draw") {
      scores[roundWinner] += 1;
    }

    const resultState: ReactionDuelState = {
      ...nextState,
      scores,
      roundWinner,
      falseStart,
      showResult: true,
    };

    await updateGameState({ reactionDuel: resultState });

    if (
      scores.me >= maxWins ||
      scores.her >= maxWins ||
      state.round >= state.maxRounds
    ) {
      setTimeout(() => endGame(getGameWinner(scores)), 2500);
    }
  };

  const handleTap = async () => {
    if (!role || state.showResult || myTap !== null) return;

    const tapTime = Date.now();
    const taps = { ...state.taps, [role]: tapTime };
    const nextState = { ...state, taps };

    if (tapTime < state.readyAt) {
      await finishRound(nextState, partnerRole, role);
      return;
    }

    if (partnerTap !== null) {
      const myReaction = tapTime - state.readyAt;
      const partnerReaction = partnerTap - state.readyAt;
      const roundWinner =
        myReaction === partnerReaction
          ? "draw"
          : myReaction < partnerReaction
          ? role
          : partnerRole;

      await finishRound(nextState, roundWinner, null);
      return;
    }

    await updateGameState({ reactionDuel: nextState });
  };

  const handleNextRound = async () => {
    if (gameOver) {
      await endGame(getGameWinner(state.scores));
      return;
    }

    await updateGameState({
      reactionDuel: {
        ...state,
        readyAt: getNextReadyAt(),
        taps: { me: null, her: null },
        round: state.round + 1,
        roundWinner: null,
        falseStart: null,
        showResult: false,
      },
    });
  };

  const myReaction = getReactionTime(state, "me");
  const herReaction = getReactionTime(state, "her");
  const countdown = Math.max(0, Math.ceil((state.readyAt - now) / 1000));

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="grid w-full grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-rose-50 p-3">
          <p className="text-3xl font-black text-rose-500">{state.scores.me}</p>
          <p className="text-xs font-bold text-rose-500">{getNickname("me")}</p>
          <p className="text-[0.65rem] text-rose-400">
            {myReaction === null ? "Ready" : `${myReaction}ms`}
          </p>
        </div>
        <div className="rounded-2xl bg-white/70 p-3">
          <p className="text-lg font-black text-rose-300">DUEL</p>
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
            {herReaction === null ? "Ready" : `${herReaction}ms`}
          </p>
        </div>
      </div>

      {state.showResult ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full space-y-4 text-center"
        >
          <div className="rounded-3xl bg-gradient-to-br from-cyan-50 to-rose-50 p-6">
            <p className="text-5xl">
              {state.falseStart ? "⚠" : state.roundWinner === "draw" ? "🤝" : "⚡"}
            </p>
            <p className="mt-2 text-xl font-black text-rose-950">
              {state.falseStart
                ? `${getNickname(state.falseStart)} tapped too early!`
                : state.roundWinner === "draw"
                ? "Exact tie!"
                : `${getNickname(state.roundWinner!)} reacted first!`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-rose-50 p-3">
              <p className="text-sm font-bold text-rose-600">
                {getNickname("me")}
              </p>
              <p className="text-2xl font-black text-rose-500">
                {myReaction === null ? "No tap" : `${myReaction}ms`}
              </p>
            </div>
            <div className="rounded-2xl bg-fuchsia-50 p-3">
              <p className="text-sm font-bold text-fuchsia-600">
                {getNickname("her")}
              </p>
              <p className="text-2xl font-black text-fuchsia-500">
                {herReaction === null ? "No tap" : `${herReaction}ms`}
              </p>
            </div>
          </div>

          {!gameOver ? (
            <Button onClick={handleNextRound} className="w-full">
              Next Duel
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
          <motion.button
            animate={{
              scale: isReady ? [1, 1.04, 1] : 1,
              backgroundColor: isReady ? "#10b981" : "#f43f5e",
            }}
            transition={{ duration: 0.45, repeat: isReady ? Infinity : 0 }}
            onClick={handleTap}
            disabled={!role || myTap !== null}
            className="grid size-56 place-items-center rounded-full text-center text-white shadow-2xl disabled:opacity-70"
          >
            <span>
              <span className="block text-5xl font-black">
                {isReady ? "TAP!" : countdown}
              </span>
              <span className="mt-2 block text-sm font-bold uppercase tracking-wider">
                {isReady ? "Hit it fast" : "Wait for green"}
              </span>
            </span>
          </motion.button>

          <p
            className={`text-center font-bold ${
              myTap ? "text-rose-400" : isReady ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {myTap
              ? `Locked in. Waiting for ${getNickname(partnerRole)}...`
              : isReady
              ? "Tap now!"
              : "Do not tap early, or your partner gets the point."}
          </p>
        </>
      )}
    </div>
  );
}
