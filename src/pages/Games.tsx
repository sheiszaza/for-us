import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  Gamepad2,
  Trophy,
  Sparkles,
  Grid3X3,
  HelpCircle,
  Layers,
  Type,
  Flame,
  ArrowLeft,
  Crown,
  History,
  Hand,
  Keyboard,
  SlidersHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNicknames } from "../context/NicknameContext";
import { useRole } from "../context/RoleContext";
import { db } from "../firebaseData";
import { useRealtimeDoc } from "../hooks/useRealtimeDoc";
import { useRealtimeCollection } from "../hooks/useRealtimeCollection";
import { useGameContent } from "../hooks/useGameContent";
import { formatShortDate } from "../lib/date";
import type {
  Game,
  GameContent,
  GameHistory,
  GameType,
  Role,
  TicTacToeCell,
} from "../types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Page } from "../components/Page";
import { Modal } from "../components/Modal";
import {
  TicTacToeGame,
  LoveQuizGame,
  WouldYouRatherGame,
  MemoryMatchGame,
  WordGuessGame,
  TruthOrDareGame,
  RockPaperScissorsGame,
  TypingRaceGame,
  ConnectFourGame,
  DotsAndBoxesGame,
  SimonSaysGame,
  ReactionDuelGame,
  CodeBreakerGame,
  shuffleArray,
} from "../components/games";

const GAME_CONFIG: Record<
  GameType,
  { name: string; icon: typeof Gamepad2; description: string; color: string }
> = {
  "tic-tac-toe": {
    name: "Love Tac Toe",
    icon: Grid3X3,
    description: "Classic X's and O's with hearts",
    color: "from-rose-400 to-pink-500",
  },
  "love-quiz": {
    name: "Love Quiz",
    icon: HelpCircle,
    description: "How well do you know each other?",
    color: "from-fuchsia-400 to-purple-500",
  },
  "would-you-rather": {
    name: "Would You Rather",
    icon: Sparkles,
    description: "Make impossible choices together",
    color: "from-amber-400 to-orange-500",
  },
  "memory-match": {
    name: "Memory Match",
    icon: Layers,
    description: "Find matching pairs together",
    color: "from-emerald-400 to-teal-500",
  },
  "word-guess": {
    name: "Word Guess",
    icon: Type,
    description: "Guess your partner's word",
    color: "from-blue-400 to-indigo-500",
  },
  "truth-or-dare": {
    name: "Truth or Dare",
    icon: Flame,
    description: "Spicy questions and challenges",
    color: "from-red-400 to-rose-500",
  },
  "rock-paper-scissors": {
    name: "Rock Paper Scissors",
    icon: Hand,
    description: "Classic showdown, best of 5!",
    color: "from-cyan-400 to-blue-500",
  },
  "typing-race": {
    name: "Typing Race",
    icon: Keyboard,
    description: "Race to type love phrases!",
    color: "from-violet-400 to-purple-500",
  },
  "connect-four": {
    name: "Connect Four",
    icon: Grid3X3,
    description: "Drop pieces and connect four in a row",
    color: "from-blue-400 to-indigo-500",
  },
  "dots-and-boxes": {
    name: "Dots & Boxes",
    icon: Layers,
    description: "Claim lines, complete boxes, steal turns",
    color: "from-amber-400 to-rose-500",
  },
  "simon-says": {
    name: "Simon Says",
    icon: Sparkles,
    description: "Memorize longer patterns under pressure",
    color: "from-emerald-400 to-violet-500",
  },
  "reaction-duel": {
    name: "Reaction Duel",
    icon: Flame,
    description: "Wait for green, then tap faster than your partner",
    color: "from-cyan-400 to-emerald-500",
  },
  "code-breaker": {
    name: "Code Breaker",
    icon: Type,
    description: "Crack the secret symbol code with smart clues",
    color: "from-indigo-400 to-purple-500",
  },
};

function generateGameId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function getRandomItem<T>(items: T[]): T | null {
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function getReactionReadyAt() {
  return Date.now() + 1800 + Math.floor(Math.random() * 3200);
}

function getSecretCode() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 6));
}

function createInitialGameState(type: GameType, gameContent: GameContent) {
  switch (type) {
    case "tic-tac-toe":
      return {
        ticTacToe: {
          board: Array(9).fill(null) as TicTacToeCell[],
          currentTurn: "me" as Role,
          winner: null,
        },
      };
    case "love-quiz":
      return {
        loveQuiz: {
          questions: [],
          currentQuestionIndex: 0,
          scores: { me: 0, her: 0 },
          phase: "asking" as const,
        },
      };
    case "would-you-rather":
      return {
        wouldYouRather: {
          currentQuestion: getRandomItem(gameContent.wouldYouRatherQuestions),
          choices: {},
          questionHistory: [],
          currentIndex: 0,
        },
      };
    case "memory-match": {
      const emojis = shuffleArray(gameContent.coupleEmojis).slice(0, 8);
      const cards = shuffleArray(
        [...emojis, ...emojis].map((emoji, index) => ({
          id: index,
          emoji,
          flipped: false,
          matched: false,
        }))
      );
      return {
        memoryMatch: {
          cards,
          currentTurn: "me" as Role,
          flippedCards: [],
          scores: { me: 0, her: 0 },
          finished: false,
        },
      };
    }
    case "word-guess":
      return {
        wordGuess: {
          targetWord: "",
          guesses: [],
          currentGuess: "",
          currentTurn: "her" as Role,
          won: false,
          lost: false,
          setBy: "me" as Role,
        },
      };
    case "truth-or-dare":
      return {
        truthOrDare: {
          currentChallenge: null,
          currentTurn: "me" as Role,
          history: [],
        },
      };
    case "rock-paper-scissors":
      return {
        rockPaperScissors: {
          choices: { me: null, her: null },
          scores: { me: 0, her: 0 },
          round: 1,
          maxRounds: 5,
          roundWinner: null,
          showResult: false,
        },
      };
    case "typing-race":
      return {
        typingRace: {
          phrase: shuffleArray(gameContent.typingPhrases)[0],
          progress: { me: "", her: "" },
          startTime: null,
          finishTimes: { me: null, her: null },
          round: 1,
          maxRounds: 3,
          scores: { me: 0, her: 0 },
          roundWinner: null,
          showResult: false,
        },
      };
    case "connect-four":
      return {
        connectFour: {
          board: Array(42).fill(null),
          currentTurn: "me" as Role,
          winner: null,
          winningCells: [],
        },
      };
    case "dots-and-boxes":
      return {
        dotsAndBoxes: {
          claimedEdges: {},
          boxes: {},
          currentTurn: "me" as Role,
          scores: { me: 0, her: 0 },
          finished: false,
        },
      };
    case "simon-says":
      return {
        simonSays: {
          sequence: [0, 1, 2].map(() => Math.floor(Math.random() * 4)),
          inputs: { me: [], her: [] },
          failed: { me: false, her: false },
          finishTimes: { me: null, her: null },
          scores: { me: 0, her: 0 },
          round: 1,
          maxRounds: 5,
          roundStartedAt: Date.now(),
          roundWinner: null,
          showResult: false,
        },
      };
    case "reaction-duel":
      return {
        reactionDuel: {
          readyAt: getReactionReadyAt(),
          taps: { me: null, her: null },
          scores: { me: 0, her: 0 },
          round: 1,
          maxRounds: 5,
          roundWinner: null,
          falseStart: null,
          showResult: false,
        },
      };
    case "code-breaker":
      return {
        codeBreaker: {
          secret: getSecretCode(),
          guesses: [],
          currentTurn: "me" as Role,
          winner: null,
          maxGuesses: 10,
        },
      };
    default:
      return {};
  }
}

export function Games() {
  const { role } = useRole();
  const { getNickname } = useNicknames();
  const navigate = useNavigate();
  const { gameContent, error: gameContentError } = useGameContent();
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: currentGame, loading: gameLoading } = useRealtimeDoc<Game>(
    "games",
    "current"
  );

  const historyConstraints = useMemo(
    () => [orderBy("playedAt", "desc"), limit(20)],
    []
  );
  const { data: gameHistory, loading: historyLoading } =
    useRealtimeCollection<GameHistory>("gameHistory", historyConstraints);

  const startGame = useCallback(
    async (type: GameType) => {
      if (!role) {
        toast.error("Please select who you are first");
        return;
      }

      try {
        const gameData = {
          id: generateGameId(),
          type,
          status: "playing" as const,
          createdBy: role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          state: createInitialGameState(type, gameContent),
        };

        await setDoc(doc(db, "games", "current"), gameData);
        toast.success(`Started ${GAME_CONFIG[type].name}!`);
        setSelectedGame(null);
      } catch (error) {
        toast.error("Couldn't start game");
      }
    },
    [gameContent, role]
  );

  const endGame = useCallback(
    async (winner?: Role | "draw") => {
      if (!currentGame) return;

      try {
        const scores =
          currentGame.state.memoryMatch?.scores ||
          currentGame.state.loveQuiz?.scores ||
          currentGame.state.rockPaperScissors?.scores ||
          currentGame.state.typingRace?.scores ||
          currentGame.state.dotsAndBoxes?.scores ||
          currentGame.state.simonSays?.scores ||
          currentGame.state.reactionDuel?.scores;

        const historyEntry: Record<string, unknown> = {
          id: generateGameId(),
          type: currentGame.type,
          winner: winner ?? null,
          playedAt: serverTimestamp(),
        };

        if (scores) {
          historyEntry.scores = scores;
        }

        await setDoc(
          doc(db, "gameHistory", historyEntry.id as string),
          historyEntry
        );
        await deleteDoc(doc(db, "games", "current"));
        toast.success("Game ended!");
      } catch (error) {
        toast.error("Couldn't end game");
      }
    },
    [currentGame]
  );

  const updateGameState = useCallback(
    async (newState: Partial<Game["state"]>) => {
      if (!currentGame) return;

      try {
        await setDoc(
          doc(db, "games", "current"),
          {
            state: { ...currentGame.state, ...newState },
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        toast.error("Couldn't update game");
      }
    },
    [currentGame]
  );

  const stats = useMemo(() => {
    const meWins = gameHistory.filter((g) => g.winner === "me").length;
    const herWins = gameHistory.filter((g) => g.winner === "her").length;
    const draws = gameHistory.filter((g) => g.winner === "draw").length;
    const totalGames = gameHistory.length;

    let meStreak = 0;
    let herStreak = 0;
    for (const game of gameHistory) {
      if (game.winner === "me") {
        if (herStreak === 0) meStreak++;
        else break;
      } else if (game.winner === "her") {
        if (meStreak === 0) herStreak++;
        else break;
      } else {
        break;
      }
    }

    const gameTypeCounts: Record<string, number> = {};
    gameHistory.forEach((g) => {
      gameTypeCounts[g.type] = (gameTypeCounts[g.type] || 0) + 1;
    });
    const favoriteGame = Object.entries(gameTypeCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] as GameType | undefined;

    return {
      meWins,
      herWins,
      draws,
      totalGames,
      meStreak,
      herStreak,
      favoriteGame,
    };
  }, [gameHistory]);

  if (gameLoading) {
    return (
      <Page eyebrow="Fun together" title="Games">
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="size-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" />
          </div>
        </Card>
      </Page>
    );
  }

  if (currentGame?.status === "playing") {
    return (
      <ActiveGame
        game={currentGame}
        role={role}
        getNickname={getNickname}
        updateGameState={updateGameState}
        endGame={endGame}
        gameContent={gameContent}
      />
    );
  }

  return (
    <Page
      eyebrow="Fun together"
      title="Games"
      description="Play real-time games with your partner. Every move syncs instantly!"
      action={
        <div className="flex gap-2">
          {role === "me" ? (
            <Button
              variant="secondary"
              onClick={() => navigate("/games-admin")}
              className="gap-2"
            >
              <SlidersHorizontal className="size-4" />
              Manage
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => setShowHistory(true)}
            className="gap-2"
          >
            <History className="size-4" />
            History
          </Button>
        </div>
      }
    >
      {gameContentError ? (
        <p className="rounded-3xl bg-white/70 p-4 text-sm font-semibold text-rose-700">
          Game content could not sync, so the built-in fallback content is being
          used.
        </p>
      ) : null}

      {stats.totalGames > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="size-5 text-amber-500" />
              <h3 className="font-black text-rose-950">Scoreboard</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 p-4 text-white shadow-lg">
                <div className="absolute -right-4 -top-4 text-6xl opacity-20">
                  👑
                </div>
                <p className="text-3xl font-black">{stats.meWins}</p>
                <p className="text-xs font-bold opacity-80">
                  {getNickname("me")} wins
                </p>
                {stats.meStreak > 1 && (
                  <p className="mt-1 text-[0.65rem] font-bold">
                    🔥 {stats.meStreak} streak!
                  </p>
                )}
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-400 to-purple-500 p-4 text-white shadow-lg">
                <div className="absolute -right-4 -top-4 text-6xl opacity-20">
                  👑
                </div>
                <p className="text-3xl font-black">{stats.herWins}</p>
                <p className="text-xs font-bold opacity-80">
                  {getNickname("her")} wins
                </p>
                {stats.herStreak > 1 && (
                  <p className="mt-1 text-[0.65rem] font-bold">
                    🔥 {stats.herStreak} streak!
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-white/60 p-4 shadow">
                <p className="text-3xl font-black text-rose-500">
                  {stats.draws}
                </p>
                <p className="text-xs font-bold text-rose-400">Draws</p>
                <p className="mt-1 text-[0.65rem] text-rose-300">🤝 Tied!</p>
              </div>

              <div className="rounded-2xl bg-white/60 p-4 shadow">
                <p className="text-3xl font-black text-rose-500">
                  {stats.totalGames}
                </p>
                <p className="text-xs font-bold text-rose-400">Total Games</p>
                {stats.favoriteGame && (
                  <p className="mt-1 text-[0.65rem] text-rose-300">
                    ❤️ {GAME_CONFIG[stats.favoriteGame].name}
                  </p>
                )}
              </div>
            </div>

            {stats.totalGames >= 3 && (
              <div className="mt-4 rounded-xl bg-white/50 p-3 text-center">
                {stats.meWins > stats.herWins ? (
                  <p className="text-sm font-bold text-rose-700">
                    🏆 {getNickname("me")} is leading by{" "}
                    {stats.meWins - stats.herWins}!
                  </p>
                ) : stats.herWins > stats.meWins ? (
                  <p className="text-sm font-bold text-rose-700">
                    🏆 {getNickname("her")} is leading by{" "}
                    {stats.herWins - stats.meWins}!
                  </p>
                ) : (
                  <p className="text-sm font-bold text-rose-700">
                    💕 You're perfectly matched!
                  </p>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      )}

      <motion.div
        className="grid gap-4 sm:grid-cols-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {(Object.keys(GAME_CONFIG) as GameType[]).map((type, index) => {
          const config = GAME_CONFIG[type];
          const Icon = config.icon;

          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                asButton
                onClick={() => setSelectedGame(type)}
                className="group relative overflow-hidden"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-0 transition-opacity group-hover:opacity-10`}
                />
                <div className="relative z-10">
                  <div
                    className={`mb-4 inline-flex rounded-2xl bg-gradient-to-br ${config.color} p-3 text-white shadow-lg`}
                  >
                    <Icon className="size-6" />
                  </div>
                  <h3 className="text-lg font-black text-rose-950">
                    {config.name}
                  </h3>
                  <p className="mt-1 text-sm text-rose-700/75">
                    {config.description}
                  </p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <Modal
        open={selectedGame !== null}
        title={selectedGame ? GAME_CONFIG[selectedGame].name : ""}
        onClose={() => setSelectedGame(null)}
      >
        {selectedGame && (
          <div className="grid gap-4">
            <p className="text-sm text-rose-700/75">
              {GAME_CONFIG[selectedGame].description}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => startGame(selectedGame)}
                className="flex-1"
              >
                <Gamepad2 className="size-4" />
                Start Game
              </Button>
              <Button variant="secondary" onClick={() => setSelectedGame(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showHistory}
        title="Game History"
        onClose={() => setShowHistory(false)}
      >
        <div className="no-scrollbar -mx-5 max-h-[65vh] space-y-3 overflow-y-auto px-5">
          {historyLoading ? (
            <p className="text-center text-sm text-rose-500">Loading...</p>
          ) : gameHistory.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mb-3 text-4xl">🎮</div>
              <p className="font-bold text-rose-950">No games played yet</p>
              <p className="mt-1 text-sm text-rose-500">
                Start playing to see your history!
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-rose-100 p-2">
                  <p className="text-lg font-black text-rose-500">
                    {stats.meWins}
                  </p>
                  <p className="text-[0.65rem] font-bold text-rose-400">
                    {getNickname("me")}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-100 p-2">
                  <p className="text-lg font-black text-gray-500">
                    {stats.draws}
                  </p>
                  <p className="text-[0.65rem] font-bold text-gray-400">
                    Draws
                  </p>
                </div>
                <div className="rounded-xl bg-fuchsia-100 p-2">
                  <p className="text-lg font-black text-fuchsia-500">
                    {stats.herWins}
                  </p>
                  <p className="text-[0.65rem] font-bold text-fuchsia-400">
                    {getNickname("her")}
                  </p>
                </div>
              </div>
              {gameHistory.map((entry, index) => {
                const config = GAME_CONFIG[entry.type];
                const Icon = config.icon;
                const isRecent = index === 0;

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-3 rounded-2xl p-3 ${
                      isRecent
                        ? "bg-gradient-to-r from-rose-100 to-pink-100 ring-2 ring-rose-200"
                        : "bg-rose-50"
                    }`}
                  >
                    <div
                      className={`rounded-xl bg-gradient-to-br ${config.color} p-2 text-white shadow`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-rose-950">{config.name}</p>
                        {isRecent && (
                          <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[0.6rem] font-bold text-white">
                            Latest
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-rose-500">
                        {formatShortDate(entry.playedAt)}
                      </p>
                      {entry.scores && (
                        <p className="mt-1 text-[0.65rem] text-rose-400">
                          Score: {entry.scores.me} - {entry.scores.her}
                        </p>
                      )}
                    </div>
                    {entry.winner && entry.winner !== "draw" ? (
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className={`rounded-full p-1.5 ${
                            entry.winner === "me"
                              ? "bg-rose-500"
                              : "bg-fuchsia-500"
                          }`}
                        >
                          <Crown className="size-3 text-white" />
                        </div>
                        <span className="text-[0.65rem] font-bold text-rose-600">
                          {getNickname(entry.winner)}
                        </span>
                      </div>
                    ) : entry.winner === "draw" ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">🤝</span>
                        <span className="text-[0.65rem] font-bold text-rose-500">
                          Draw
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">🚪</span>
                        <span className="text-[0.65rem] font-bold text-rose-400">
                          Left
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </>
          )}
        </div>
      </Modal>
    </Page>
  );
}

type ActiveGameProps = {
  game: Game;
  gameContent: GameContent;
  role: Role | null;
  getNickname: (role: Role) => string;
  updateGameState: (state: Partial<Game["state"]>) => Promise<void>;
  endGame: (winner?: Role | "draw") => Promise<void>;
};

function ActiveGame({
  game,
  gameContent,
  role,
  getNickname,
  updateGameState,
  endGame,
}: ActiveGameProps) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const config = GAME_CONFIG[game.type];
  const Icon = config.icon;

  const renderGame = () => {
    const props = {
      game,
      gameContent,
      role,
      getNickname,
      updateGameState,
      endGame,
    };

    switch (game.type) {
      case "tic-tac-toe":
        return <TicTacToeGame {...props} />;
      case "love-quiz":
        return <LoveQuizGame {...props} />;
      case "would-you-rather":
        return <WouldYouRatherGame {...props} />;
      case "memory-match":
        return <MemoryMatchGame {...props} />;
      case "word-guess":
        return <WordGuessGame {...props} />;
      case "truth-or-dare":
        return <TruthOrDareGame {...props} />;
      case "rock-paper-scissors":
        return <RockPaperScissorsGame {...props} />;
      case "typing-race":
        return <TypingRaceGame {...props} />;
      case "connect-four":
        return <ConnectFourGame {...props} />;
      case "dots-and-boxes":
        return <DotsAndBoxesGame {...props} />;
      case "simon-says":
        return <SimonSaysGame {...props} />;
      case "reaction-duel":
        return <ReactionDuelGame {...props} />;
      case "code-breaker":
        return <CodeBreakerGame {...props} />;
      default:
        return null;
    }
  };

  return (
    <Page
      eyebrow="Now playing"
      title={config.name}
      action={
        <Button variant="ghost" onClick={() => setShowLeaveConfirm(true)}>
          <ArrowLeft className="size-4" />
          Leave
        </Button>
      }
    >
      <Card className="overflow-hidden">
        <div
          className={`-m-5 mb-4 bg-gradient-to-r ${config.color} p-4 text-white`}
        >
          <div className="flex items-center gap-3">
            <Icon className="size-6" />
            <span className="font-bold">{config.description}</span>
          </div>
        </div>
        {renderGame()}
      </Card>

      <Modal
        open={showLeaveConfirm}
        title="Leave Game?"
        onClose={() => setShowLeaveConfirm(false)}
      >
        <div className="space-y-4 text-center">
          <div className="text-5xl">🚪</div>
          <p className="text-rose-700">
            Are you sure you want to leave? The game will end for both of you.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowLeaveConfirm(false)}
              className="flex-1"
            >
              Keep Playing
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setShowLeaveConfirm(false);
                endGame();
              }}
              className="flex-1"
            >
              Leave Game
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}
