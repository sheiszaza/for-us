import { motion, AnimatePresence } from "framer-motion";
import { X, Circle } from "lucide-react";
import type { TicTacToeCell, Role } from "../../types";
import type { GameComponentProps } from "./types";

export function TicTacToeGame({
  game,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.ticTacToe;
  if (!state) return null;

  const checkWinner = (board: TicTacToeCell[]): Role | "draw" | null => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }

    if (board.every((cell) => cell !== null)) {
      return "draw";
    }

    return null;
  };

  const handleCellClick = async (index: number) => {
    if (
      !role ||
      state.winner ||
      state.board[index] ||
      state.currentTurn !== role
    ) {
      return;
    }

    const newBoard = [...state.board];
    newBoard[index] = role;
    const winner = checkWinner(newBoard);

    await updateGameState({
      ticTacToe: {
        ...state,
        board: newBoard,
        currentTurn: role === "me" ? "her" : "me",
        winner,
      },
    });

    if (winner) {
      setTimeout(() => endGame(winner), 1500);
    }
  };

  const isMyTurn = state.currentTurn === role;

  return (
    <div className="flex flex-col items-center gap-6">
      <AnimatePresence mode="wait">
        {state.winner ? (
          <motion.div
            key="winner"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <div className="mb-2 text-4xl">
              {state.winner === "draw" ? "🤝" : "🎉"}
            </div>
            <p className="text-xl font-black text-rose-950">
              {state.winner === "draw"
                ? "It's a draw!"
                : `${getNickname(state.winner)} wins!`}
            </p>
          </motion.div>
        ) : (
          <motion.p
            key="turn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center font-bold ${
              isMyTurn ? "text-rose-500" : "text-rose-400"
            }`}
          >
            {isMyTurn
              ? "Your turn!"
              : `Waiting for ${getNickname(state.currentTurn)}...`}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-3">
        {state.board.map((cell, index) => (
          <motion.button
            key={index}
            whileHover={
              !cell && isMyTurn && !state.winner ? { scale: 1.05 } : {}
            }
            whileTap={!cell && isMyTurn && !state.winner ? { scale: 0.95 } : {}}
            onClick={() => handleCellClick(index)}
            disabled={!!cell || !isMyTurn || !!state.winner}
            className={`grid size-20 place-items-center rounded-2xl text-4xl font-bold transition sm:size-24 ${
              cell
                ? cell === "me"
                  ? "bg-rose-100 text-rose-500"
                  : "bg-pink-100 text-pink-500"
                : isMyTurn && !state.winner
                ? "bg-rose-50 hover:bg-rose-100"
                : "bg-rose-50/50"
            }`}
          >
            <AnimatePresence mode="wait">
              {cell && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  {cell === "me" ? (
                    <X className="size-10 stroke-[3]" />
                  ) : (
                    <Circle className="size-10 stroke-[3]" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <X className="size-5 text-rose-500" />
          <span className="font-bold text-rose-700">{getNickname("me")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Circle className="size-5 text-pink-500" />
          <span className="font-bold text-pink-700">{getNickname("her")}</span>
        </div>
      </div>
    </div>
  );
}
