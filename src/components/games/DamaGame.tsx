import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { DamaCell, DamaPiece, Role } from "../../types";
import type { GameComponentProps } from "./types";

const BOARD_SIZE = 8;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const KING_DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

type Direction = (typeof KING_DIRECTIONS)[number];

type DamaMove = {
  from: number;
  to: number;
  path: number[];
  captured: number[];
};

type CaptureBurst = {
  id: number;
  cells: Array<{ index: number; role: Role }>;
};

type DamaMoveInfo = {
  moves: DamaMove[];
  requiredCaptureCount: number;
  continuingCapture: boolean;
};

const getOpponent = (role: Role): Role => (role === "me" ? "her" : "me");
const getIndex = (row: number, column: number) => row * BOARD_SIZE + column;
const getPosition = (index: number) => ({
  row: Math.floor(index / BOARD_SIZE),
  column: index % BOARD_SIZE,
});
const isInsideBoard = (row: number, column: number) =>
  row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE;
const getPromotionRow = (role: Role) => (role === "me" ? 0 : BOARD_SIZE - 1);

const cloneBoard = (board: DamaCell[]) =>
  board.map((piece) => (piece ? { ...piece } : null));

const getManMoveDirections = (role: Role): Direction[] => {
  const forwardRow = role === "me" ? -1 : 1;
  return [
    [forwardRow, 0],
    [0, -1],
    [0, 1],
  ];
};

const getQuietMovesForPiece = (
  board: DamaCell[],
  from: number,
  piece: DamaPiece
): DamaMove[] => {
  const { row, column } = getPosition(from);
  const moves: DamaMove[] = [];

  if (!piece.king) {
    for (const [rowStep, columnStep] of getManMoveDirections(piece.role)) {
      const nextRow = row + rowStep;
      const nextColumn = column + columnStep;
      const to = getIndex(nextRow, nextColumn);

      if (isInsideBoard(nextRow, nextColumn) && !board[to]) {
        moves.push({ from, to, path: [from, to], captured: [] });
      }
    }

    return moves;
  }

  for (const [rowStep, columnStep] of KING_DIRECTIONS) {
    let nextRow = row + rowStep;
    let nextColumn = column + columnStep;

    while (isInsideBoard(nextRow, nextColumn)) {
      const to = getIndex(nextRow, nextColumn);
      if (board[to]) break;

      moves.push({ from, to, path: [from, to], captured: [] });
      nextRow += rowStep;
      nextColumn += columnStep;
    }
  }

  return moves;
};

const getManCaptureSteps = (
  board: DamaCell[],
  from: number,
  piece: DamaPiece
) => {
  const { row, column } = getPosition(from);

  return KING_DIRECTIONS.flatMap(([rowStep, columnStep]) => {
    const jumpedRow = row + rowStep;
    const jumpedColumn = column + columnStep;
    const landingRow = row + rowStep * 2;
    const landingColumn = column + columnStep * 2;

    if (
      !isInsideBoard(jumpedRow, jumpedColumn) ||
      !isInsideBoard(landingRow, landingColumn)
    ) {
      return [];
    }

    const jumpedIndex = getIndex(jumpedRow, jumpedColumn);
    const landingIndex = getIndex(landingRow, landingColumn);
    const jumpedPiece = board[jumpedIndex];

    if (
      jumpedPiece?.role !== getOpponent(piece.role) ||
      board[landingIndex] !== null
    ) {
      return [];
    }

    return [{ to: landingIndex, captured: jumpedIndex }];
  });
};

const getKingCaptureSteps = (
  board: DamaCell[],
  from: number,
  piece: DamaPiece
) => {
  const { row, column } = getPosition(from);
  const steps: Array<{ to: number; captured: number }> = [];

  for (const [rowStep, columnStep] of KING_DIRECTIONS) {
    let nextRow = row + rowStep;
    let nextColumn = column + columnStep;
    let capturedIndex: number | null = null;

    while (isInsideBoard(nextRow, nextColumn)) {
      const nextIndex = getIndex(nextRow, nextColumn);
      const nextPiece = board[nextIndex];

      if (!nextPiece) {
        if (capturedIndex !== null) {
          steps.push({ to: nextIndex, captured: capturedIndex });
        }
      } else if (nextPiece.role === piece.role || capturedIndex !== null) {
        break;
      } else {
        capturedIndex = nextIndex;
      }

      nextRow += rowStep;
      nextColumn += columnStep;
    }
  }

  return steps;
};

const getCaptureSteps = (board: DamaCell[], from: number, piece: DamaPiece) =>
  piece.king
    ? getKingCaptureSteps(board, from, piece)
    : getManCaptureSteps(board, from, piece);

const getCaptureMovesForPiece = (
  board: DamaCell[],
  from: number,
  piece: DamaPiece,
  origin = from,
  path: number[] = [from],
  captured: number[] = []
): DamaMove[] => {
  const steps = getCaptureSteps(board, from, piece);

  if (steps.length === 0) {
    return captured.length > 0
      ? [{ from: origin, to: from, path, captured }]
      : [];
  }

  return steps.flatMap((step) => {
    const nextBoard = cloneBoard(board);
    nextBoard[from] = null;
    nextBoard[step.captured] = null;
    nextBoard[step.to] = piece;

    return getCaptureMovesForPiece(
      nextBoard,
      step.to,
      piece,
      origin,
      [...path, step.to],
      [...captured, step.captured]
    );
  });
};

const getLegalMoves = (board: DamaCell[], role: Role): DamaMove[] => {
  const captureMoves = board.flatMap((piece, index) =>
    piece?.role === role ? getCaptureMovesForPiece(board, index, piece) : []
  );

  if (captureMoves.length > 0) {
    const maxCaptureCount = Math.max(
      ...captureMoves.map((move) => move.captured.length)
    );
    return captureMoves.filter(
      (move) => move.captured.length === maxCaptureCount
    );
  }

  return board.flatMap((piece, index) =>
    piece?.role === role ? getQuietMovesForPiece(board, index, piece) : []
  );
};

const getBestCaptureChains = (
  board: DamaCell[],
  role: Role,
  fromIndex?: number
) => {
  const captureMoves =
    fromIndex === undefined
      ? board.flatMap((piece, index) =>
          piece?.role === role ? getCaptureMovesForPiece(board, index, piece) : []
        )
      : board[fromIndex]?.role === role
      ? getCaptureMovesForPiece(board, fromIndex, board[fromIndex])
      : [];

  if (captureMoves.length === 0) {
    return { captureMoves: [], maxCaptureCount: 0 };
  }

  const maxCaptureCount = Math.max(
    ...captureMoves.map((move) => move.captured.length)
  );

  return {
    captureMoves: captureMoves.filter(
      (move) => move.captured.length === maxCaptureCount
    ),
    maxCaptureCount,
  };
};

const getFirstCaptureSteps = (captureMoves: DamaMove[]): DamaMove[] => {
  const steps = new Map<string, DamaMove>();

  for (const move of captureMoves) {
    const nextIndex = move.path[1];
    const capturedIndex = move.captured[0];
    if (nextIndex === undefined || capturedIndex === undefined) continue;

    const key = `${move.from}-${nextIndex}-${capturedIndex}`;
    if (!steps.has(key)) {
      steps.set(key, {
        from: move.from,
        to: nextIndex,
        path: [move.from, nextIndex],
        captured: [capturedIndex],
      });
    }
  }

  return Array.from(steps.values());
};

const getPlayableMoves = (
  board: DamaCell[],
  role: Role,
  forcedFrom: number | null
): DamaMoveInfo => {
  if (forcedFrom !== null) {
    const { captureMoves, maxCaptureCount } = getBestCaptureChains(
      board,
      role,
      forcedFrom
    );

    return {
      moves: getFirstCaptureSteps(captureMoves),
      requiredCaptureCount: maxCaptureCount,
      continuingCapture: maxCaptureCount > 0,
    };
  }

  const { captureMoves, maxCaptureCount } = getBestCaptureChains(board, role);
  if (captureMoves.length > 0) {
    return {
      moves: getFirstCaptureSteps(captureMoves),
      requiredCaptureCount: maxCaptureCount,
      continuingCapture: false,
    };
  }

  return {
    moves: board.flatMap((piece, index) =>
      piece?.role === role ? getQuietMovesForPiece(board, index, piece) : []
    ),
    requiredCaptureCount: 0,
    continuingCapture: false,
  };
};

const applyMove = (board: DamaCell[], move: DamaMove, role: Role) => {
  const nextBoard = cloneBoard(board);
  const movingPiece = nextBoard[move.from];
  const landedPosition = getPosition(move.to);

  if (!movingPiece) return nextBoard;

  nextBoard[move.from] = null;
  for (const capturedIndex of move.captured) {
    nextBoard[capturedIndex] = null;
  }

  nextBoard[move.to] = {
    ...movingPiece,
    king: movingPiece.king || landedPosition.row === getPromotionRow(role),
  };

  return nextBoard;
};

const getPieceCounts = (board: DamaCell[]) =>
  board.reduce(
    (counts, piece) => {
      if (piece) counts[piece.role] += 1;
      return counts;
    },
    { me: 0, her: 0 }
  );

const getWinner = (
  board: DamaCell[],
  role: Role,
  nextRole: Role
): Role | "draw" | null => {
  const pieceCounts = getPieceCounts(board);

  if (pieceCounts[nextRole] === 0) return role;
  if (pieceCounts[role] === 0) return nextRole;
  if (getLegalMoves(board, nextRole).length === 0) return role;

  return null;
};

export function DamaGame({
  game,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.dama;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [captureBurst, setCaptureBurst] = useState<CaptureBurst | null>(null);
  const captureBurstTimeoutRef = useRef<number | null>(null);
  const forcedFrom = state?.forcedFrom ?? null;

  const moveInfo = useMemo(
    () =>
      state
        ? getPlayableMoves(state.board, state.currentTurn, forcedFrom)
        : { moves: [], requiredCaptureCount: 0, continuingCapture: false },
    [forcedFrom, state]
  );
  const legalMoves = moveInfo.moves;
  const selectedMoves = useMemo(
    () => legalMoves.filter((move) => move.from === selectedIndex),
    [legalMoves, selectedIndex]
  );

  useEffect(() => {
    if (forcedFrom !== null) {
      setSelectedIndex(forcedFrom);
    }
  }, [forcedFrom]);

  useEffect(() => {
    return () => {
      if (captureBurstTimeoutRef.current !== null) {
        window.clearTimeout(captureBurstTimeoutRef.current);
      }
    };
  }, []);

  if (!state) return null;

  const isMyTurn = state.currentTurn === role;
  const mandatoryCaptureCount = moveInfo.requiredCaptureCount;
  const pieceCounts = getPieceCounts(state.board);

  const handleCellClick = async (index: number) => {
    if (!role || !isMyTurn || state.winner) return;

    const destinationMove = selectedMoves.find((move) => move.to === index);
    if (destinationMove) {
      const nextRole = getOpponent(role);
      const nextBoard = applyMove(state.board, destinationMove, role);
      const movedPiece = nextBoard[destinationMove.to];
      const mustContinueCapturing =
        destinationMove.captured.length > 0 &&
        movedPiece !== null &&
        getBestCaptureChains(nextBoard, role, destinationMove.to)
          .maxCaptureCount > 0;
      const winner = mustContinueCapturing
        ? null
        : getWinner(nextBoard, role, nextRole);
      const capturedCells = destinationMove.captured.map((capturedIndex) => ({
        index: capturedIndex,
        role: state.board[capturedIndex]?.role ?? nextRole,
      }));

      if (capturedCells.length > 0) {
        if (captureBurstTimeoutRef.current !== null) {
          window.clearTimeout(captureBurstTimeoutRef.current);
        }

        setCaptureBurst({
          id: Date.now(),
          cells: capturedCells,
        });
        captureBurstTimeoutRef.current = window.setTimeout(() => {
          setCaptureBurst(null);
          captureBurstTimeoutRef.current = null;
        }, 650);
      }

      await updateGameState({
        dama: {
          ...state,
          board: nextBoard,
          currentTurn: mustContinueCapturing ? role : nextRole,
          winner,
          captured: {
            ...state.captured,
            [role]: state.captured[role] + destinationMove.captured.length,
          },
          lastMove: destinationMove.path,
          forcedFrom: mustContinueCapturing ? destinationMove.to : null,
        },
      });

      setSelectedIndex(mustContinueCapturing ? destinationMove.to : null);

      if (winner) {
        setTimeout(() => endGame(winner), 1800);
      }
      return;
    }

    const piece = state.board[index];
    const pieceMoves = legalMoves.filter((move) => move.from === index);
    if (
      piece?.role === role &&
      pieceMoves.length > 0 &&
      (forcedFrom === null || forcedFrom === index)
    ) {
      setSelectedIndex(index);
      return;
    }

    if (forcedFrom === null) {
      setSelectedIndex(null);
    }
  };

  const getStatusText = () => {
    if (state.winner) {
      return state.winner === "draw"
        ? "No winner this time."
        : `${getNickname(state.winner)} wins Dama!`;
    }

    if (!role) return "Choose who you are to play.";
    if (!isMyTurn) return `Waiting for ${getNickname(state.currentTurn)}...`;
    if (moveInfo.continuingCapture) {
      return mandatoryCaptureCount > 1
        ? `Keep eating with the same piece. ${mandatoryCaptureCount} captures left.`
        : "Keep eating with the same piece.";
    }
    if (mandatoryCaptureCount > 0) {
      return mandatoryCaptureCount > 1
        ? `Capture is mandatory. Play the ${mandatoryCaptureCount}-piece chain one eat at a time.`
        : "Capture is mandatory. Choose a jump.";
    }

    return "Move one of your pieces forward, sideways, or slide a king.";
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="grid w-full grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-rose-50 p-3">
          <p className="text-3xl font-black text-rose-500">
            {state.captured.me}
          </p>
          <p className="text-xs font-bold text-rose-500">
            {getNickname("me")} captures
          </p>
          <p className="mt-1 text-[0.65rem] text-rose-400">
            {pieceCounts.me} pieces left
          </p>
        </div>
        <div className="rounded-2xl bg-white/70 p-3 flex flex-col items-center justify-center">
          <p className="text-lg font-black text-amber-600">DAMA</p>
          <p className="text-xs text-rose-400">
            {state.currentTurn === "me"
              ? getNickname("me")
              : getNickname("her")}{" "}
            to move
          </p>
        </div>
        <div className="rounded-2xl bg-fuchsia-50 p-3">
          <p className="text-3xl font-black text-fuchsia-500">
            {state.captured.her}
          </p>
          <p className="text-xs font-bold text-fuchsia-500">
            {getNickname("her")} captures
          </p>
          <p className="mt-1 text-[0.65rem] text-fuchsia-400">
            {pieceCounts.her} pieces left
          </p>
        </div>
      </div>

      <p
        className={`text-center font-bold ${
          isMyTurn && !state.winner ? "text-rose-600" : "text-rose-400"
        }`}
      >
        {getStatusText()}
      </p>

      <div className="w-full max-w-[25rem] rounded-3xl bg-gradient-to-br from-stone-700 to-amber-700 p-2 shadow-lg">
        <div className="grid grid-cols-8 overflow-hidden rounded-2xl">
          {Array.from({ length: CELL_COUNT }, (_, index) => {
            const { row, column } = getPosition(index);
            const piece = state.board[index];
            const isSelected = selectedIndex === index;
            const isDestination = selectedMoves.some(
              (move) => move.to === index
            );
            const isLastMove = state.lastMove.includes(index);
            const isLightSquare = (row + column) % 2 === 0;
            const hasLegalMoves = legalMoves.some(
              (move) => move.from === index
            );
            const isMandatoryPiece = mandatoryCaptureCount > 0 && hasLegalMoves;
            const isCaptureDestination = selectedMoves.some(
              (move) => move.to === index && move.captured.length > 0
            );
            const captureBurstId = captureBurst?.id ?? 0;
            const burstCell = captureBurst?.cells.find(
              (cell) => cell.index === index
            );

            return (
              <motion.button
                key={index}
                whileHover={
                  isMyTurn && (isDestination || hasLegalMoves)
                    ? { scale: 1.04 }
                    : {}
                }
                whileTap={
                  isMyTurn && (isDestination || hasLegalMoves)
                    ? { scale: 0.96 }
                    : {}
                }
                onClick={() => handleCellClick(index)}
                disabled={!isMyTurn || !!state.winner}
                aria-label={`Dama square ${row + 1}, ${column + 1}`}
                className={`relative grid aspect-square place-items-center text-lg transition sm:text-2xl ${
                  isLightSquare ? "bg-amber-100" : "bg-amber-200"
                } ${isSelected ? "ring-4 ring-inset ring-rose-400" : ""} ${
                  isMandatoryPiece && !isSelected
                    ? "shadow-[inset_0_0_0_3px_rgba(244,63,94,0.75)]"
                    : ""
                } ${
                  isLastMove
                    ? "shadow-[inset_0_0_0_3px_rgba(251,191,36,0.8)]"
                    : ""
                }`}
              >
                {isDestination ? (
                  <span
                    className={`absolute size-4 rounded-full shadow ${
                      isCaptureDestination
                        ? "animate-ping bg-rose-500/80"
                        : "bg-emerald-400/80"
                    }`}
                  />
                ) : null}
                {burstCell ? (
                  <motion.span
                    key={`${captureBurstId}-${index}`}
                    initial={{ opacity: 0.95, scale: 0.75, y: 0, rotate: 0 }}
                    animate={{
                      opacity: [0.95, 0.9, 0],
                      scale: [0.75, 1.45, 0.25],
                      y: [0, -8, -18],
                      rotate: [0, burstCell.role === "me" ? -12 : 12, 0],
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`pointer-events-none absolute z-20 grid size-9 place-items-center rounded-full border-2 text-lg font-black shadow-lg sm:size-11 ${
                      burstCell.role === "me"
                        ? "border-rose-200 bg-rose-500 text-white"
                        : "border-fuchsia-200 bg-fuchsia-500 text-white"
                    }`}
                  >
                    ✦
                  </motion.span>
                ) : null}
                {piece ? (
                  <span
                    className={`relative z-10 grid size-8 place-items-center rounded-full border-2 text-sm font-black shadow-md sm:size-10 sm:text-base ${
                      piece.role === "me"
                        ? "border-rose-200 bg-rose-500 text-white"
                        : "border-fuchsia-200 bg-fuchsia-500 text-white"
                    } ${
                      isMandatoryPiece && isMyTurn
                        ? "animate-pulse ring-4 ring-yellow-300"
                        : hasLegalMoves && isMyTurn
                        ? "ring-2 ring-white"
                        : ""
                    }`}
                  >
                    {piece.king ? "K" : piece.role === "me" ? "❤" : "●"}
                  </span>
                ) : null}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="grid w-full gap-2 rounded-2xl bg-amber-50 p-4 text-xs font-semibold text-amber-800">
        <p>
          Men move one square forward or sideways. Kings slide any distance.
        </p>
        <p>
          Captures are orthogonal and mandatory. When several captures exist,
          the longest capture chain must be played.
        </p>
      </div>
    </div>
  );
}
