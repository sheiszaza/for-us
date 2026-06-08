import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type {
  Role,
  UnoCard,
  UnoCardColor,
  UnoPlayableColor,
  UnoState,
} from "../../types";
import type { GameComponentProps } from "./types";

type DrawResult = {
  hands: UnoState["hands"];
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  drawnCount: number;
};

const PLAYABLE_COLORS: UnoPlayableColor[] = ["red", "yellow", "green", "blue"];

const CARD_STYLES: Record<UnoCardColor, string> = {
  red: "from-red-500 to-rose-600 text-white",
  yellow: "from-yellow-300 to-amber-400 text-amber-950",
  green: "from-emerald-400 to-green-600 text-white",
  blue: "from-sky-400 to-blue-600 text-white",
  wild: "from-slate-900 via-purple-700 to-rose-600 text-white",
};

const COLOR_DOT_STYLES: Record<UnoPlayableColor, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-300",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
};

const COLOR_BUTTON_STYLES: Record<UnoPlayableColor, string> = {
  red: "bg-red-500 text-white",
  yellow: "bg-yellow-300 text-amber-950",
  green: "bg-emerald-500 text-white",
  blue: "bg-blue-500 text-white",
};

const getOpponent = (role: Role): Role => (role === "me" ? "her" : "me");

const shuffleCards = (cards: UnoCard[]) => {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
};

const getTopCard = (state: UnoState) =>
  state.discardPile[state.discardPile.length - 1] ?? null;

const getCardLabel = (card: UnoCard) => {
  if (card.kind === "number") return String(card.value);
  if (card.kind === "draw-two") return "+2";
  if (card.kind === "wild-draw-four") return "+4";
  if (card.kind === "reverse") return "REV";
  if (card.kind === "skip") return "SKIP";
  return "WILD";
};

const getCardName = (card: UnoCard) => {
  if (card.kind === "number") return `${card.color} ${card.value}`;
  if (card.kind === "draw-two") return `${card.color} Draw Two`;
  if (card.kind === "wild-draw-four") return "Wild Draw Four";
  if (card.kind === "reverse") return `${card.color} Reverse`;
  if (card.kind === "skip") return `${card.color} Skip`;
  return "Wild";
};

const canPlayCard = (
  card: UnoCard,
  topCard: UnoCard | null,
  activeColor: UnoPlayableColor
) => {
  if (card.color === "wild") return true;
  if (!topCard) return true;
  if (card.color === activeColor) return true;
  if (card.kind === topCard.kind && card.kind !== "number") return true;
  return card.kind === "number" && card.value === topCard.value;
};

const canStackDrawCard = (card: UnoCard, activeColor: UnoPlayableColor) => {
  if (card.kind === "wild-draw-four") return true;
  return card.kind === "draw-two" && card.color === activeColor;
};

const getDrawPenalty = (card: UnoCard) => {
  if (card.kind === "wild-draw-four") return 4;
  if (card.kind === "draw-two") return 2;
  return 0;
};

const getStackedDrawCount = (discardPile: UnoCard[]) => {
  let total = 0;

  for (let index = discardPile.length - 1; index >= 0; index -= 1) {
    const penalty = getDrawPenalty(discardPile[index]);
    if (penalty === 0) break;
    total += penalty;
  }

  return total;
};

const drawCards = (
  state: Pick<UnoState, "hands" | "drawPile" | "discardPile">,
  targetRole: Role,
  count: number
): DrawResult => {
  let drawPile = [...state.drawPile];
  let discardPile = [...state.discardPile];
  const drawnCards: UnoCard[] = [];

  for (let index = 0; index < count; index += 1) {
    if (drawPile.length === 0 && discardPile.length > 1) {
      const topCard = discardPile[discardPile.length - 1];
      drawPile = shuffleCards(discardPile.slice(0, -1));
      discardPile = [topCard];
    }

    const drawnCard = drawPile.shift();
    if (!drawnCard) break;
    drawnCards.push(drawnCard);
  }

  return {
    hands: {
      ...state.hands,
      [targetRole]: [...state.hands[targetRole], ...drawnCards],
    },
    drawPile,
    discardPile,
    drawnCount: drawnCards.length,
  };
};

type UnoCardViewProps = {
  card?: UnoCard;
  disabled?: boolean;
  faceDown?: boolean;
  featured?: boolean;
  highlight?: boolean;
  playable?: boolean;
  compact?: boolean;
  label?: string;
  text?: string;
  onClick?: () => void;
};

function UnoCardView({
  card,
  disabled = false,
  faceDown = false,
  featured = false,
  highlight = false,
  playable = false,
  compact = false,
  label,
  text,
  onClick,
}: UnoCardViewProps) {
  const cardColor = card?.color ?? "wild";
  const isDisabled = disabled || !onClick;

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 16, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      whileHover={!isDisabled ? { y: -6, rotate: 1 } : {}}
      whileTap={!isDisabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={label ?? (card ? getCardName(card) : "UNO card")}
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-white/80 bg-gradient-to-br p-2 text-center font-black shadow-md transition ${
        featured
          ? "h-40 w-28 rounded-3xl text-4xl shadow-2xl sm:h-48 sm:w-32"
          : compact
          ? "h-20 w-12"
          : "h-28 w-16 sm:h-32 sm:w-20"
      } ${faceDown ? CARD_STYLES.wild : CARD_STYLES[cardColor]} ${
        highlight
          ? "animate-pulse ring-4 ring-yellow-300 ring-offset-2 ring-offset-slate-900"
          : playable
          ? "ring-4 ring-emerald-300 ring-offset-1"
          : ""
      } ${isDisabled ? "cursor-default" : "cursor-pointer"}`}
    >
      {faceDown ? (
        <span className="text-xs tracking-[0.2em]">UNO</span>
      ) : card ? (
        <span
          className={featured ? "text-4xl sm:text-5xl" : "text-xl sm:text-2xl"}
        >
          {getCardLabel(card)}
        </span>
      ) : (
        <span className={compact ? "text-xs uppercase" : "text-sm uppercase"}>
          {text ?? "Draw"}
        </span>
      )}
    </motion.button>
  );
}

export function UnoGame({
  game,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.uno;
  const [wildCardId, setWildCardId] = useState<string | null>(null);
  const pendingDrawCount = state?.pendingDrawCount
    ? getStackedDrawCount(state.discardPile) || state.pendingDrawCount
    : 0;

  const topCard = useMemo(() => (state ? getTopCard(state) : null), [state]);
  const playableCardIds = useMemo(() => {
    if (!state || !role) return new Set<string>();

    return new Set(
      state.hands[role]
        .filter((card) =>
          pendingDrawCount > 0
            ? canStackDrawCard(card, state.activeColor)
            : canPlayCard(card, topCard, state.activeColor)
        )
        .map((card) => card.id)
    );
  }, [pendingDrawCount, role, state, topCard]);

  if (!state) return null;

  const isMyTurn = state.currentTurn === role;
  const currentHand = role ? state.hands[role] : [];
  const opponentRole = role ? getOpponent(role) : null;
  const opponentHand = opponentRole ? state.hands[opponentRole] : [];
  const hasPlayableCard = playableCardIds.size > 0;
  const drewThisTurn = role ? state.drewThisTurn?.[role] ?? false : false;
  const shouldHighlightDraw =
    isMyTurn && !state.winner && !drewThisTurn && !hasPlayableCard;
  const pendingWildCard = role
    ? state.hands[role].find((card) => card.id === wildCardId) ?? null
    : null;

  const playCard = async (cardId: string, chosenColor?: UnoPlayableColor) => {
    if (!role || !isMyTurn || state.winner) return;

    const card = state.hands[role].find((item) => item.id === cardId);
    if (!card) return;
    if (pendingDrawCount > 0 && !canStackDrawCard(card, state.activeColor)) {
      return;
    }
    if (
      pendingDrawCount === 0 &&
      !canPlayCard(card, topCard, state.activeColor)
    ) {
      return;
    }
    if (card.color === "wild" && !chosenColor) {
      setWildCardId(card.id);
      return;
    }

    const opponent = getOpponent(role);
    const remainingHand = state.hands[role].filter(
      (item) => item.id !== cardId
    );
    const activeColor =
      card.color === "wild" ? chosenColor ?? "red" : card.color;
    const winner = remainingHand.length === 0 ? role : null;
    let nextHands: UnoState["hands"] = {
      ...state.hands,
      [role]: remainingHand,
    };
    let nextDrawPile = [...state.drawPile];
    let nextDiscardPile = [...state.discardPile, card];
    let nextTurn: Role = opponent;
    let nextPendingDrawCount = 0;
    let message = `${getNickname(role)} played ${getCardName(card)}.`;

    if (!winner) {
      if (card.kind === "skip" || card.kind === "reverse") {
        nextTurn = role;
        message = `${getNickname(role)} played ${getCardName(
          card
        )} and skips ${getNickname(opponent)}.`;
      }

      if (card.kind === "draw-two" || card.kind === "wild-draw-four") {
        const addedDrawCount = getDrawPenalty(card);
        nextTurn = opponent;
        nextPendingDrawCount = pendingDrawCount + addedDrawCount;
        message = `${getNickname(
          role
        )} stacked +${addedDrawCount}. ${getNickname(
          opponent
        )} must stack a plus card or draw ${nextPendingDrawCount}.`;
      }
    } else {
      message = `${getNickname(role)} played ${getCardName(card)} and wins!`;
    }

    setWildCardId(null);
    await updateGameState({
      uno: {
        ...state,
        hands: nextHands,
        drawPile: nextDrawPile,
        discardPile: nextDiscardPile,
        currentTurn: winner ? role : nextTurn,
        activeColor,
        pendingDrawCount: winner ? 0 : nextPendingDrawCount,
        winner,
        drewThisTurn: { me: false, her: false },
        lastMove: {
          by: role,
          action: "play",
          card,
          chosenColor: card.color === "wild" ? activeColor : null,
          message,
          at: Date.now(),
        },
      },
    });

    if (winner) {
      setTimeout(() => endGame(winner), 1800);
    }
  };

  const handleCardClick = (cardId: string) => {
    void playCard(cardId);
  };

  const handleChooseWildColor = (color: UnoPlayableColor) => {
    if (!pendingWildCard) return;
    void playCard(pendingWildCard.id, color);
  };

  const handleDrawCard = async () => {
    if (
      !role ||
      !isMyTurn ||
      state.winner ||
      drewThisTurn ||
      (pendingDrawCount === 0 && hasPlayableCard)
    ) {
      return;
    }

    const drawCount = pendingDrawCount > 0 ? pendingDrawCount : 1;
    const opponent = getOpponent(role);
    const drawResult = drawCards(state, role, drawCount);
    await updateGameState({
      uno: {
        ...state,
        hands: drawResult.hands,
        drawPile: drawResult.drawPile,
        discardPile: drawResult.discardPile,
        currentTurn: pendingDrawCount > 0 ? opponent : state.currentTurn,
        pendingDrawCount: 0,
        drewThisTurn:
          pendingDrawCount > 0
            ? { me: false, her: false }
            : { ...state.drewThisTurn, [role]: true },
        lastMove: {
          by: role,
          action: "draw",
          card: null,
          chosenColor: null,
          message:
            drawResult.drawnCount > 0
              ? pendingDrawCount > 0
                ? `${getNickname(role)} drew ${drawResult.drawnCount} cards.`
                : `${getNickname(role)} drew a card.`
              : `${getNickname(role)} tried to draw, but the deck is empty.`,
          at: Date.now(),
        },
      },
    });
  };

  const handlePass = async () => {
    if (
      !role ||
      !isMyTurn ||
      state.winner ||
      !drewThisTurn ||
      pendingDrawCount > 0
    ) {
      return;
    }

    const opponent = getOpponent(role);
    await updateGameState({
      uno: {
        ...state,
        currentTurn: opponent,
        drewThisTurn: { me: false, her: false },
        lastMove: {
          by: role,
          action: "pass",
          card: null,
          chosenColor: null,
          message: `${getNickname(role)} passed the turn.`,
          at: Date.now(),
        },
      },
    });
  };

  const getStatusText = () => {
    if (state.winner) return `${getNickname(state.winner)} wins UNO Duel!`;
    if (!role) return "Choose who you are to play.";
    if (!isMyTurn) return `Waiting for ${getNickname(state.currentTurn)}...`;
    if (pendingDrawCount > 0) {
      return `Stack +4, play a ${state.activeColor} +2, or draw ${pendingDrawCount} cards.`;
    }
    if (drewThisTurn) return "You drew. Play a matching card or pass.";
    if (hasPlayableCard) return "Play a matching card or a wild card.";
    return "No playable card. Draw one from the pile.";
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex w-full items-stretch justify-between gap-3 text-center">
        <div className="min-w-0 flex-1 rounded-2xl bg-rose-50 p-3">
          <p className="text-3xl font-black text-rose-500">
            {state.hands.me.length}
          </p>
          <p className="text-xs font-bold text-rose-500">
            {getNickname("me")} cards
          </p>
        </div>

        <div className="min-w-0 flex-1 rounded-2xl bg-fuchsia-50 p-3">
          <p className="text-3xl font-black text-fuchsia-500">
            {state.hands.her.length}
          </p>
          <p className="text-xs font-bold text-fuchsia-500">
            {getNickname("her")} cards
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

      <div className="w-full rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 p-4 text-white shadow-xl">
        <div className="mb-4">
          <p className="mb-2 text-center text-xs font-black uppercase tracking-[0.25em] text-white/60">
            {opponentRole ? getNickname(opponentRole) : "Partner"}
          </p>
          <div className="flex min-h-20 justify-center -space-x-8 overflow-hidden px-4">
            {opponentHand.map((card) => (
              <UnoCardView key={card.id} card={card} faceDown compact />
            ))}
          </div>
          {opponentHand.length === 1 ? (
            <p className="mt-2 text-center text-sm font-black text-yellow-200">
              UNO!
            </p>
          ) : null}
        </div>

        <div className="grid min-h-56 grid-cols-[4rem_1fr_4rem] items-center gap-2 py-4 sm:min-h-64 sm:grid-cols-[5rem_1fr_5rem] sm:gap-4">
          <div className="grid place-items-center gap-2">
            <UnoCardView
              label={
                pendingDrawCount > 0
                  ? `Draw ${pendingDrawCount} cards`
                  : "Draw a card"
              }
              text={pendingDrawCount > 0 ? `+${pendingDrawCount}` : "UNO"}
              highlight={shouldHighlightDraw}
              compact
              disabled={
                !isMyTurn ||
                drewThisTurn ||
                (pendingDrawCount === 0 && hasPlayableCard)
              }
              onClick={handleDrawCard}
            />
            <p className="rounded-full bg-white/10 px-2 py-1 text-[0.65rem] font-bold text-white/70">
              {state.drawPile.length} left
            </p>
          </div>

          <div className="grid place-items-center gap-3">
            <span className="rounded-full bg-white/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.2em] text-white/60">
              Play card
            </span>
            {topCard ? (
              <UnoCardView
                key={`${topCard.id}-${state.discardPile.length}`}
                card={topCard}
                featured
                label={`Top card ${getCardName(topCard)}`}
              />
            ) : null}
          </div>

          <div aria-hidden="true" />
        </div>

        {state.lastMove ? (
          <motion.p
            key={state.lastMove.at}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl bg-white/10 px-4 py-2 text-center text-xs font-semibold text-white/80"
          >
            {state.lastMove.message}
          </motion.p>
        ) : null}
      </div>

      {role ? (
        <div className="w-full rounded-[1.75rem] bg-white/70 p-3 shadow-inner shadow-rose-100">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-black text-rose-950">Your hand</p>
            {currentHand.length === 1 ? (
              <span className="rounded-full bg-yellow-300 px-3 py-1 text-xs font-black text-amber-950">
                UNO!
              </span>
            ) : (
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-500">
                {currentHand.length} cards
              </span>
            )}
          </div>
          <div className="no-scrollbar -mx-3 flex gap-1 overflow-x-auto px-3 pb-2 pt-3">
            {currentHand.map((card) => {
              const playable = isMyTurn && playableCardIds.has(card.id);

              return (
                <UnoCardView
                  key={card.id}
                  card={card}
                  playable={playable}
                  disabled={!playable || !!state.winner}
                  onClick={() => handleCardClick(card.id)}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {isMyTurn && drewThisTurn && pendingDrawCount === 0 && !state.winner ? (
        <button
          type="button"
          onClick={handlePass}
          className="rounded-full bg-rose-500 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:bg-rose-600"
        >
          Pass Turn
        </button>
      ) : null}

      {pendingWildCard ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-rose-950/40 p-5 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-2xl"
          >
            <p className="text-lg font-black text-rose-950">
              Choose a wild color
            </p>
            <p className="mt-1 text-sm text-rose-500">
              This becomes the active color for the next turn.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {PLAYABLE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleChooseWildColor(color)}
                  className={`rounded-2xl px-4 py-4 text-sm font-black uppercase shadow ${COLOR_BUTTON_STYLES[color]}`}
                >
                  {color}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setWildCardId(null)}
              className="mt-4 text-sm font-bold text-rose-400"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
