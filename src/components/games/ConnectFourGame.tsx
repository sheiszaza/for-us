import { motion } from "framer-motion";
import type { ConnectFourCell, Role } from "../../types";
import type { GameComponentProps } from "./types";

const ROWS = 6;
const COLUMNS = 7;
const WIN_LENGTH = 4;

const getIndex = (row: number, column: number) => row * COLUMNS + column;

const getWinningCells = (
  board: ConnectFourCell[],
  role: Role
): number[] | null => {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      if (board[getIndex(row, column)] !== role) continue;

      for (const [rowStep, columnStep] of directions) {
        const cells = [getIndex(row, column)];

        for (let offset = 1; offset < WIN_LENGTH; offset++) {
          const nextRow = row + rowStep * offset;
          const nextColumn = column + columnStep * offset;

          if (
            nextRow < 0 ||
            nextRow >= ROWS ||
            nextColumn < 0 ||
            nextColumn >= COLUMNS
          ) {
            break;
          }

          const nextIndex = getIndex(nextRow, nextColumn);
          if (board[nextIndex] !== role) break;
          cells.push(nextIndex);
        }

        if (cells.length === WIN_LENGTH) {
          return cells;
        }
      }
    }
  }

  return null;
};

const getWinner = (
  board: ConnectFourCell[]
): { winner: Role | "draw" | null; winningCells: number[] } => {
  const meCells = getWinningCells(board, "me");
  if (meCells) return { winner: "me", winningCells: meCells };

  const herCells = getWinningCells(board, "her");
  if (herCells) return { winner: "her", winningCells: herCells };

  if (board.every(Boolean)) return { winner: "draw", winningCells: [] };

  return { winner: null, winningCells: [] };
};

export function ConnectFourGame({
  game,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.connectFour;
  if (!state) return null;

  const isMyTurn = state.currentTurn === role;

  const handleColumnClick = async (column: number) => {
    if (!role || !isMyTurn || state.winner) return;

    const dropRow = Array.from({ length: ROWS }, (_, index) => ROWS - 1 - index)
      .find((row) => !state.board[getIndex(row, column)]);

    if (dropRow === undefined) return;

    const nextBoard = [...state.board];
    nextBoard[getIndex(dropRow, column)] = role;
    const result = getWinner(nextBoard);

    await updateGameState({
      connectFour: {
        ...state,
        board: nextBoard,
        currentTurn: role === "me" ? "her" : "me",
        winner: result.winner,
        winningCells: result.winningCells,
      },
    });

    const winner = result.winner;
    if (winner) {
      setTimeout(() => endGame(winner), 1800);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-center">
        {state.winner ? (
          <>
            <div className="text-4xl">{state.winner === "draw" ? "🤝" : "🏆"}</div>
            <p className="mt-2 text-xl font-black text-rose-950">
              {state.winner === "draw"
                ? "Board full! It's a draw."
                : `${getNickname(state.winner)} connected four!`}
            </p>
          </>
        ) : (
          <p
            className={`font-bold ${
              isMyTurn ? "text-rose-600" : "text-rose-400"
            }`}
          >
            {isMyTurn
              ? "Drop a heart into any column."
              : `Waiting for ${getNickname(state.currentTurn)}...`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 rounded-3xl bg-gradient-to-br from-blue-400 to-indigo-500 p-2 shadow-lg sm:gap-2 sm:p-3">
        {state.board.map((cell, index) => {
          const column = index % COLUMNS;
          const isWinningCell = state.winningCells.includes(index);

          return (
            <motion.button
              key={index}
              whileHover={!state.winner && isMyTurn ? { scale: 1.06 } : {}}
              whileTap={!state.winner && isMyTurn ? { scale: 0.94 } : {}}
              onClick={() => handleColumnClick(column)}
              disabled={!isMyTurn || !!state.winner}
              className={`grid size-10 place-items-center rounded-full border-4 border-white/40 text-xl shadow-inner transition sm:size-12 sm:text-2xl ${
                cell === "me"
                  ? "bg-rose-400"
                  : cell === "her"
                  ? "bg-fuchsia-400"
                  : "bg-white/80 hover:bg-white"
              } ${isWinningCell ? "ring-4 ring-yellow-300" : ""}`}
            >
              {cell ? (cell === "me" ? "❤" : "●") : ""}
            </motion.button>
          );
        })}
      </div>

      <div className="grid w-full grid-cols-2 gap-3 text-center">
        <div className="rounded-2xl bg-rose-50 p-3">
          <p className="text-sm font-bold text-rose-700">{getNickname("me")}</p>
          <p className="text-xs text-rose-400">Red hearts</p>
        </div>
        <div className="rounded-2xl bg-fuchsia-50 p-3">
          <p className="text-sm font-bold text-fuchsia-700">
            {getNickname("her")}
          </p>
          <p className="text-xs text-fuchsia-400">Purple dots</p>
        </div>
      </div>
    </div>
  );
}
