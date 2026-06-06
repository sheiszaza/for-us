import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameComponentProps } from "./types";

export function MemoryMatchGame({
  game,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.memoryMatch;
  const [isProcessing, setIsProcessing] = useState(false);

  if (!state) return null;

  const isMyTurn = state.currentTurn === role;

  const handleCardClick = async (cardId: number) => {
    if (
      !role ||
      !isMyTurn ||
      isProcessing ||
      state.finished ||
      state.flippedCards.length >= 2
    ) {
      return;
    }

    const card = state.cards.find((c) => c.id === cardId);
    if (!card || card.flipped || card.matched) return;

    const newFlipped = [...state.flippedCards, cardId];
    const newCards = state.cards.map((c) =>
      c.id === cardId ? { ...c, flipped: true } : c
    );

    await updateGameState({
      memoryMatch: {
        ...state,
        cards: newCards,
        flippedCards: newFlipped,
      },
    });

    if (newFlipped.length === 2) {
      setIsProcessing(true);

      setTimeout(async () => {
        const [first, second] = newFlipped;
        const firstCard = state.cards.find((c) => c.id === first)!;
        const secondCard = state.cards.find((c) => c.id === second)!;

        const isMatch = firstCard.emoji === secondCard.emoji;

        const updatedCards = state.cards.map((c) => {
          if (c.id === first || c.id === second) {
            return isMatch
              ? { ...c, flipped: true, matched: true }
              : { ...c, flipped: false };
          }
          return c;
        });

        const newScores = { ...state.scores };
        if (isMatch) {
          newScores[role] += 1;
        }

        const allMatched = updatedCards.every((c) => c.matched);

        await updateGameState({
          memoryMatch: {
            ...state,
            cards: updatedCards,
            flippedCards: [],
            scores: newScores,
            currentTurn: isMatch ? role : role === "me" ? "her" : "me",
            finished: allMatched,
          },
        });

        if (allMatched) {
          setTimeout(() => {
            const winner =
              newScores.me > newScores.her
                ? "me"
                : newScores.her > newScores.me
                ? "her"
                : "draw";
            endGame(winner);
          }, 1500);
        }

        setIsProcessing(false);
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-6 text-center">
        <div
          className={`rounded-2xl px-4 py-2 ${
            state.currentTurn === "me"
              ? "bg-rose-500 text-white"
              : "bg-rose-100"
          }`}
        >
          <p
            className={`text-2xl font-black ${
              state.currentTurn === "me" ? "text-white" : "text-rose-500"
            }`}
          >
            {state.scores.me}
          </p>
          <p
            className={`text-xs font-bold ${
              state.currentTurn === "me" ? "text-white/80" : "text-rose-400"
            }`}
          >
            {getNickname("me")}
          </p>
        </div>
        <div
          className={`rounded-2xl px-4 py-2 ${
            state.currentTurn === "her"
              ? "bg-pink-500 text-white"
              : "bg-pink-100"
          }`}
        >
          <p
            className={`text-2xl font-black ${
              state.currentTurn === "her" ? "text-white" : "text-pink-500"
            }`}
          >
            {state.scores.her}
          </p>
          <p
            className={`text-xs font-bold ${
              state.currentTurn === "her" ? "text-white/80" : "text-pink-400"
            }`}
          >
            {getNickname("her")}
          </p>
        </div>
      </div>

      <p
        className={`text-center font-bold ${
          isMyTurn ? "text-rose-500" : "text-rose-400"
        }`}
      >
        {state.finished
          ? "Game Over!"
          : isMyTurn
          ? "Your turn! Find a match"
          : `Waiting for ${getNickname(state.currentTurn)}...`}
      </p>

      <div className="grid grid-cols-4 gap-3">
        {state.cards.map((card) => (
          <motion.button
            key={card.id}
            whileHover={
              !card.flipped && !card.matched && isMyTurn && !isProcessing
                ? { scale: 1.05 }
                : {}
            }
            whileTap={
              !card.flipped && !card.matched && isMyTurn && !isProcessing
                ? { scale: 0.95 }
                : {}
            }
            onClick={() => handleCardClick(card.id)}
            disabled={card.flipped || card.matched || !isMyTurn || isProcessing}
            className={`grid size-16 place-items-center rounded-2xl text-3xl transition sm:size-20 sm:text-4xl ${
              card.matched
                ? "bg-emerald-100"
                : card.flipped
                ? "bg-rose-100"
                : "bg-gradient-to-br from-rose-400 to-pink-500 shadow-lg"
            }`}
          >
            <AnimatePresence mode="wait">
              {card.flipped || card.matched ? (
                <motion.span
                  initial={{ rotateY: 90 }}
                  animate={{ rotateY: 0 }}
                  exit={{ rotateY: 90 }}
                  transition={{ duration: 0.2 }}
                  className="text-4xl sm:text-5xl"
                >
                  {card.emoji}
                </motion.span>
              ) : (
                <motion.span
                  initial={{ rotateY: 90 }}
                  animate={{ rotateY: 0 }}
                  className="text-4xl text-white sm:text-5xl"
                >
                  💕
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
