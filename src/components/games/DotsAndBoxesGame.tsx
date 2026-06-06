import { motion } from "framer-motion";
import type { Role } from "../../types";
import type { GameComponentProps } from "./types";

const BOX_SIZE = 3;
const DOT_SIZE = BOX_SIZE + 1;
const TOTAL_BOXES = BOX_SIZE * BOX_SIZE;

const getHorizontalEdgeId = (row: number, column: number) => `h-${row}-${column}`;
const getVerticalEdgeId = (row: number, column: number) => `v-${row}-${column}`;
const getBoxId = (row: number, column: number) => `b-${row}-${column}`;

const getBoxEdges = (row: number, column: number) => [
  getHorizontalEdgeId(row, column),
  getHorizontalEdgeId(row + 1, column),
  getVerticalEdgeId(row, column),
  getVerticalEdgeId(row, column + 1),
];

const getAdjacentBoxes = (edgeId: string) => {
  const [kind, rowValue, columnValue] = edgeId.split("-");
  const row = Number(rowValue);
  const column = Number(columnValue);
  const boxes: Array<{ row: number; column: number }> = [];

  if (kind === "h") {
    if (row > 0) boxes.push({ row: row - 1, column });
    if (row < BOX_SIZE) boxes.push({ row, column });
  }

  if (kind === "v") {
    if (column > 0) boxes.push({ row, column: column - 1 });
    if (column < BOX_SIZE) boxes.push({ row, column });
  }

  return boxes.filter(
    (box) =>
      box.row >= 0 &&
      box.row < BOX_SIZE &&
      box.column >= 0 &&
      box.column < BOX_SIZE
  );
};

const isBoxComplete = (
  row: number,
  column: number,
  claimedEdges: Record<string, Role>
) => getBoxEdges(row, column).every((edgeId) => claimedEdges[edgeId]);

export function DotsAndBoxesGame({
  game,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.dotsAndBoxes;
  if (!state) return null;

  const isMyTurn = state.currentTurn === role;

  const handleEdgeClick = async (edgeId: string) => {
    if (!role || !isMyTurn || state.finished || state.claimedEdges[edgeId]) {
      return;
    }

    const claimedEdges = { ...state.claimedEdges, [edgeId]: role };
    const boxes = { ...state.boxes };
    let completedBoxes = 0;

    for (const box of getAdjacentBoxes(edgeId)) {
      const boxId = getBoxId(box.row, box.column);
      if (!boxes[boxId] && isBoxComplete(box.row, box.column, claimedEdges)) {
        boxes[boxId] = role;
        completedBoxes += 1;
      }
    }

    const scores = {
      me: Object.values(boxes).filter((owner) => owner === "me").length,
      her: Object.values(boxes).filter((owner) => owner === "her").length,
    };
    const finished = Object.keys(boxes).length === TOTAL_BOXES;

    await updateGameState({
      dotsAndBoxes: {
        ...state,
        claimedEdges,
        boxes,
        scores,
        currentTurn:
          completedBoxes > 0 ? role : role === "me" ? "her" : "me",
        finished,
      },
    });

    if (finished) {
      const winner =
        scores.me > scores.her ? "me" : scores.her > scores.me ? "her" : "draw";
      setTimeout(() => endGame(winner), 1800);
    }
  };

  const renderEdge = (edgeId: string, orientation: "horizontal" | "vertical") => {
    const owner = state.claimedEdges[edgeId];
    const isHorizontal = orientation === "horizontal";

    return (
      <motion.button
        key={edgeId}
        whileHover={!owner && isMyTurn && !state.finished ? { scale: 1.08 } : {}}
        whileTap={!owner && isMyTurn && !state.finished ? { scale: 0.94 } : {}}
        onClick={() => handleEdgeClick(edgeId)}
        disabled={!!owner || !isMyTurn || state.finished}
        className={`rounded-full transition ${
          isHorizontal ? "h-3 w-12 sm:w-16" : "h-12 w-3 sm:h-16"
        } ${
          owner === "me"
            ? "bg-rose-500 shadow"
            : owner === "her"
            ? "bg-fuchsia-500 shadow"
            : isMyTurn && !state.finished
            ? "bg-rose-100 hover:bg-rose-300"
            : "bg-rose-50"
        }`}
        aria-label="Claim line"
      />
    );
  };

  const renderBox = (row: number, column: number) => {
    const boxId = getBoxId(row, column);
    const owner = state.boxes[boxId];

    return (
      <div
        key={boxId}
        className={`grid size-12 place-items-center rounded-xl text-xl font-black sm:size-16 ${
          owner === "me"
            ? "bg-rose-100 text-rose-500"
            : owner === "her"
            ? "bg-fuchsia-100 text-fuchsia-500"
            : "bg-white/50"
        }`}
      >
        {owner ? (owner === "me" ? "❤" : "★") : ""}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="grid w-full grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-rose-50 p-3">
          <p className="text-3xl font-black text-rose-500">{state.scores.me}</p>
          <p className="text-xs font-bold text-rose-500">{getNickname("me")}</p>
        </div>
        <div className="rounded-2xl bg-white/70 p-3">
          <p className="text-lg font-black text-rose-300">BOXES</p>
          <p className="text-xs text-rose-400">
            {Object.keys(state.boxes).length}/{TOTAL_BOXES}
          </p>
        </div>
        <div className="rounded-2xl bg-fuchsia-50 p-3">
          <p className="text-3xl font-black text-fuchsia-500">
            {state.scores.her}
          </p>
          <p className="text-xs font-bold text-fuchsia-500">
            {getNickname("her")}
          </p>
        </div>
      </div>

      <p
        className={`text-center font-bold ${
          isMyTurn ? "text-rose-600" : "text-rose-400"
        }`}
      >
        {state.finished
          ? "All boxes claimed!"
          : isMyTurn
          ? "Claim a line. Complete a box to keep your turn."
          : `Waiting for ${getNickname(state.currentTurn)}...`}
      </p>

      <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-rose-50 p-4 shadow-inner">
        <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto_auto] items-center justify-items-center gap-1">
          {Array.from({ length: DOT_SIZE * 2 - 1 }).flatMap((_, gridRow) =>
            Array.from({ length: DOT_SIZE * 2 - 1 }).map((__, gridColumn) => {
              const key = `${gridRow}-${gridColumn}`;

              if (gridRow % 2 === 0 && gridColumn % 2 === 0) {
                return (
                  <div
                    key={key}
                    className="size-3 rounded-full bg-rose-400 shadow"
                  />
                );
              }

              if (gridRow % 2 === 0 && gridColumn % 2 === 1) {
                return renderEdge(
                  getHorizontalEdgeId(gridRow / 2, Math.floor(gridColumn / 2)),
                  "horizontal"
                );
              }

              if (gridRow % 2 === 1 && gridColumn % 2 === 0) {
                return renderEdge(
                  getVerticalEdgeId(Math.floor(gridRow / 2), gridColumn / 2),
                  "vertical"
                );
              }

              return renderBox(
                Math.floor(gridRow / 2),
                Math.floor(gridColumn / 2)
              );
            })
          )}
        </div>
      </div>

      {state.finished ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl bg-white/70 p-4 text-center"
        >
          <p className="text-2xl font-black text-rose-950">
            {state.scores.me === state.scores.her
              ? "It's a draw!"
              : `${getNickname(
                  state.scores.me > state.scores.her ? "me" : "her"
                )} wins!`}
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}
