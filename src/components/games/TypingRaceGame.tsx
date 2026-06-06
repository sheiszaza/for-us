import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { Role } from "../../types";
import { Button } from "../Button";
import { TYPING_PHRASES, shuffleArray } from "./constants";
import type { GameComponentProps } from "./types";

export function TypingRaceGame({
  game,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.typingRace;
  const [localInput, setLocalInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSyncRef = useRef<string>("");

  useEffect(() => {
    if (state && role && state.progress[role] !== lastSyncRef.current) {
      setLocalInput(state.progress[role]);
      lastSyncRef.current = state.progress[role];
    }
  }, [state, role]);

  useEffect(() => {
    if (inputRef.current && state && !state.showResult) {
      inputRef.current.focus();
    }
  }, [state?.showResult]);

  if (!state) return null;

  const partnerRole: Role = role === "me" ? "her" : "me";
  const myProgress = role ? state.progress[role] : "";
  const partnerProgress = state.progress[partnerRole];
  const myFinished = role ? state.finishTimes[role] !== null : false;
  const partnerFinished = state.finishTimes[partnerRole] !== null;
  const bothFinished = myFinished && partnerFinished;

  const calculateAccuracy = (typed: string, target: string) => {
    if (typed.length === 0) return 100;
    let correct = 0;
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === target[i]) correct++;
    }
    return Math.round((correct / typed.length) * 100);
  };

  const myAccuracy = calculateAccuracy(myProgress, state.phrase);
  const partnerAccuracy = calculateAccuracy(partnerProgress, state.phrase);

  const handleInputChange = async (value: string) => {
    if (!role || myFinished || state.showResult) return;

    setLocalInput(value);
    lastSyncRef.current = value;

    const startTime = state.startTime || Date.now();
    const isComplete = value === state.phrase;

    const newFinishTimes = { ...state.finishTimes };
    if (isComplete) {
      newFinishTimes[role] = Date.now() - startTime;
    }

    await updateGameState({
      typingRace: {
        ...state,
        progress: { ...state.progress, [role]: value },
        startTime,
        finishTimes: newFinishTimes,
      },
    });

    if (isComplete && state.finishTimes[partnerRole] !== null) {
      handleRoundEnd(newFinishTimes);
    }
  };

  const handleRoundEnd = async (finishTimes: { me: number | null; her: number | null }) => {
    const meTime = finishTimes.me;
    const herTime = finishTimes.her;

    let roundWinner: Role | null = null;
    if (meTime !== null && herTime !== null) {
      roundWinner = meTime < herTime ? "me" : meTime > herTime ? "her" : null;
    } else if (meTime !== null) {
      roundWinner = "me";
    } else if (herTime !== null) {
      roundWinner = "her";
    }

    const newScores = { ...state.scores };
    if (roundWinner) {
      newScores[roundWinner] += 1;
    }

    await updateGameState({
      typingRace: {
        ...state,
        finishTimes,
        scores: newScores,
        roundWinner,
        showResult: true,
      },
    });

    const maxWins = Math.ceil(state.maxRounds / 2);
    if (newScores.me >= maxWins || newScores.her >= maxWins) {
      setTimeout(() => {
        endGame(newScores.me > newScores.her ? "me" : "her");
      }, 3000);
    }
  };

  useEffect(() => {
    if (
      state &&
      !state.showResult &&
      state.finishTimes.me !== null &&
      state.finishTimes.her !== null
    ) {
      handleRoundEnd(state.finishTimes);
    }
  }, [state?.finishTimes.me, state?.finishTimes.her]);

  const handleNextRound = async () => {
    const newPhrase = shuffleArray(TYPING_PHRASES.filter(p => p !== state.phrase))[0];

    await updateGameState({
      typingRace: {
        ...state,
        phrase: newPhrase,
        progress: { me: "", her: "" },
        startTime: null,
        finishTimes: { me: null, her: null },
        round: state.round + 1,
        roundWinner: null,
        showResult: false,
      },
    });
    setLocalInput("");
    lastSyncRef.current = "";
  };

  const formatTime = (ms: number) => {
    const seconds = (ms / 1000).toFixed(2);
    return `${seconds}s`;
  };

  const getCharClass = (index: number, typed: string, target: string) => {
    if (index >= typed.length) return "text-rose-300";
    if (typed[index] === target[index]) return "text-emerald-500";
    return "text-red-500 bg-red-100";
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
          <p className="text-2xl font-black text-rose-300">⌨️</p>
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

      {state.showResult ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full space-y-4 text-center"
        >
          <div
            className={`rounded-2xl p-6 ${
              state.roundWinner === "me"
                ? "bg-rose-100"
                : state.roundWinner === "her"
                ? "bg-fuchsia-100"
                : "bg-gray-100"
            }`}
          >
            <p className="mb-2 text-4xl">
              {state.roundWinner ? "🏆" : "🤝"}
            </p>
            <p className="text-xl font-black text-rose-950">
              {state.roundWinner
                ? `${getNickname(state.roundWinner)} wins this round!`
                : "It's a tie!"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-rose-50 p-3">
              <p className="text-sm font-bold text-rose-700">
                {getNickname("me")}
              </p>
              <p className="text-2xl font-black text-rose-500">
                {state.finishTimes.me !== null
                  ? formatTime(state.finishTimes.me)
                  : "DNF"}
              </p>
              <p className="text-xs text-rose-400">
                {calculateAccuracy(state.progress.me, state.phrase)}% accuracy
              </p>
            </div>
            <div className="rounded-xl bg-fuchsia-50 p-3">
              <p className="text-sm font-bold text-fuchsia-700">
                {getNickname("her")}
              </p>
              <p className="text-2xl font-black text-fuchsia-500">
                {state.finishTimes.her !== null
                  ? formatTime(state.finishTimes.her)
                  : "DNF"}
              </p>
              <p className="text-xs text-fuchsia-400">
                {calculateAccuracy(state.progress.her, state.phrase)}% accuracy
              </p>
            </div>
          </div>

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
          <div className="w-full rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-rose-400">
              Type this phrase:
            </p>
            <p className="font-mono text-lg leading-relaxed">
              {state.phrase.split("").map((char, i) => (
                <span key={i} className={getCharClass(i, localInput, state.phrase)}>
                  {char}
                </span>
              ))}
            </p>
          </div>

          <div className="w-full space-y-2">
            <input
              ref={inputRef}
              type="text"
              value={localInput}
              onChange={(e) => handleInputChange(e.target.value)}
              disabled={myFinished}
              placeholder="Start typing..."
              className="w-full rounded-xl bg-white px-4 py-3 font-mono text-rose-950 shadow-inner ring-2 ring-rose-200 placeholder:text-rose-300 focus:outline-none focus:ring-rose-400"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <div className="flex justify-between text-xs">
              <span className="text-rose-400">
                {myProgress.length} / {state.phrase.length} characters
              </span>
              <span className={myAccuracy === 100 ? "text-emerald-500" : "text-rose-500"}>
                {myAccuracy}% accuracy
              </span>
            </div>
          </div>

          {myFinished && !partnerFinished && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl bg-emerald-100 px-4 py-2 text-center"
            >
              <p className="font-bold text-emerald-700">
                ✓ Done! Waiting for {getNickname(partnerRole)}...
              </p>
            </motion.div>
          )}

          <div className="w-full space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Progress
            </p>
            <div className="space-y-2">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-bold text-rose-600">
                    {getNickname("me")}
                    {myFinished && " ✓"}
                  </span>
                  <span className="text-rose-400">
                    {Math.round((myProgress.length / state.phrase.length) * 100)}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-rose-100">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(myProgress.length / state.phrase.length) * 100}%`,
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-bold text-fuchsia-600">
                    {getNickname("her")}
                    {partnerFinished && " ✓"}
                  </span>
                  <span className="text-fuchsia-400">
                    {Math.round((partnerProgress.length / state.phrase.length) * 100)}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-fuchsia-100">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(partnerProgress.length / state.phrase.length) * 100}%`,
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
