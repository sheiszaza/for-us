import type { Timestamp } from 'firebase/firestore';

export type Role = 'me' | 'her';

export type FirestoreDate = Timestamp | Date;

export type MessageReply = {
  id: string;
  text: string;
  from: Role;
  imageUrl?: string | null;
};

export type Message = {
  id: string;
  text: string;
  from: Role;
  createdAt: FirestoreDate;
  seenByMe: boolean;
  seenByHer: boolean;
  imageUrl?: string;
  imagePath?: string;
  replyTo?: MessageReply;
  reactions?: Partial<Record<Role, string>>;
  editedAt?: FirestoreDate | null;
  editedBy?: Role;
  deletedAt?: FirestoreDate | null;
  deletedBy?: Role;
};

export type TypingStatus = {
  role: Role;
  isTyping: boolean;
  updatedAt?: FirestoreDate | null;
};

export type PresenceStatus = {
  role: Role;
  isOnline: boolean;
  updatedAt?: FirestoreDate | null;
};

export type HomeNote = {
  id: string;
  text: string;
  fromRole: Role;
  targetRole: Role;
  updatedAt: FirestoreDate;
};

export type Memory = {
  id: string;
  title: string;
  description: string;
  date: string;
  imageUrl: string;
  imagePath?: string;
  createdBy: Role;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type Letter = {
  id: string;
  title: string;
  content: string;
  createdBy: Role;
  createdAt: FirestoreDate;
};

export type Countdown = {
  id: string;
  title: string;
  targetDate: string;
  createdBy: Role;
};

export type DateIdeaStatus = 'planned' | 'upcoming' | 'completed';

export type DateIdea = {
  id: string;
  title: string;
  description: string;
  createdBy: Role;
  status: DateIdeaStatus;
};

export type LiveLocation = {
  id: string;
  role: Role;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  sharing: boolean;
  updatedAt?: FirestoreDate | null;
};

export type GameType =
  | 'tic-tac-toe'
  | 'love-quiz'
  | 'would-you-rather'
  | 'memory-match'
  | 'word-guess'
  | 'truth-or-dare'
  | 'rock-paper-scissors'
  | 'typing-race'
  | 'connect-four'
  | 'dots-and-boxes'
  | 'simon-says'
  | 'reaction-duel'
  | 'code-breaker';

export type GameStatus = 'waiting' | 'playing' | 'finished';

export type WouldYouRatherQuestion = {
  optionA: string;
  optionB: string;
};

export type GameContent = {
  loveQuizQuestions: string[];
  wouldYouRatherQuestions: WouldYouRatherQuestion[];
  truths: string[];
  dares: string[];
  wordGuessWords: string[];
  coupleEmojis: string[];
  typingPhrases: string[];
  updatedAt?: FirestoreDate;
  updatedBy?: Role;
};

export type TicTacToeCell = 'me' | 'her' | null;

export type TicTacToeState = {
  board: TicTacToeCell[];
  currentTurn: Role;
  winner: Role | 'draw' | null;
};

export type LoveQuizQuestion = {
  question: string;
  answer: string;
  askedBy: Role;
  guessedAnswer?: string;
  guessedBy?: Role;
  correct?: boolean;
};

export type LoveQuizState = {
  questions: LoveQuizQuestion[];
  currentQuestionIndex: number;
  scores: { me: number; her: number };
  phase: 'asking' | 'answering' | 'reveal' | 'finished';
};

export type WouldYouRatherState = {
  currentQuestion: WouldYouRatherQuestion | null;
  choices: { me?: 'A' | 'B'; her?: 'A' | 'B' };
  questionHistory: Array<{
    optionA: string;
    optionB: string;
    meChoice: 'A' | 'B';
    herChoice: 'A' | 'B';
  }>;
  currentIndex: number;
};

export type MemoryCard = {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
};

export type MemoryMatchState = {
  cards: MemoryCard[];
  currentTurn: Role;
  flippedCards: number[];
  scores: { me: number; her: number };
  finished: boolean;
};

export type WordGuessState = {
  targetWord: string;
  guesses: Array<{ word: string; by: Role }>;
  currentGuess: string;
  currentTurn: Role;
  won: boolean;
  lost: boolean;
  setBy: Role;
};

export type TruthOrDareState = {
  currentChallenge: { type: 'truth' | 'dare'; text: string } | null;
  currentTurn: Role;
  history: Array<{ type: 'truth' | 'dare'; text: string; completedBy: Role }>;
};

export type RockPaperScissorsChoice = 'rock' | 'paper' | 'scissors' | null;

export type RockPaperScissorsState = {
  choices: { me: RockPaperScissorsChoice; her: RockPaperScissorsChoice };
  scores: { me: number; her: number };
  round: number;
  maxRounds: number;
  roundWinner: Role | 'draw' | null;
  showResult: boolean;
};

export type TypingRaceState = {
  phrase: string;
  progress: { me: number; her: number };
  accuracies?: { me: number; her: number };
  startTime: number | null;
  finishTimes: { me: number | null; her: number | null };
  round: number;
  maxRounds: number;
  scores: { me: number; her: number };
  roundWinner: Role | null;
  showResult: boolean;
};

export type ConnectFourCell = Role | null;

export type ConnectFourState = {
  board: ConnectFourCell[];
  currentTurn: Role;
  winner: Role | 'draw' | null;
  winningCells: number[];
};

export type DotsAndBoxesState = {
  claimedEdges: Record<string, Role>;
  boxes: Record<string, Role>;
  currentTurn: Role;
  scores: { me: number; her: number };
  finished: boolean;
};

export type SimonSaysState = {
  sequence: number[];
  inputs: { me: number[]; her: number[] };
  failed: { me: boolean; her: boolean };
  finishTimes: { me: number | null; her: number | null };
  scores: { me: number; her: number };
  round: number;
  maxRounds: number;
  roundStartedAt: number;
  roundWinner: Role | 'draw' | null;
  showResult: boolean;
};

export type ReactionDuelState = {
  readyAt: number;
  taps: { me: number | null; her: number | null };
  scores: { me: number; her: number };
  round: number;
  maxRounds: number;
  roundWinner: Role | 'draw' | null;
  falseStart: Role | null;
  showResult: boolean;
};

export type CodeBreakerGuess = {
  by: Role;
  code: number[];
  exact: number;
  close: number;
};

export type CodeBreakerState = {
  secret: number[];
  guesses: CodeBreakerGuess[];
  currentTurn: Role;
  winner: Role | 'draw' | null;
  maxGuesses: number;
};

export type GameState = {
  ticTacToe?: TicTacToeState;
  loveQuiz?: LoveQuizState;
  wouldYouRather?: WouldYouRatherState;
  memoryMatch?: MemoryMatchState;
  wordGuess?: WordGuessState;
  truthOrDare?: TruthOrDareState;
  rockPaperScissors?: RockPaperScissorsState;
  typingRace?: TypingRaceState;
  connectFour?: ConnectFourState;
  dotsAndBoxes?: DotsAndBoxesState;
  simonSays?: SimonSaysState;
  reactionDuel?: ReactionDuelState;
  codeBreaker?: CodeBreakerState;
};

export type Game = {
  id: string;
  type: GameType;
  status: GameStatus;
  createdBy: Role;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
  state: GameState;
  winner?: Role | 'draw';
};

export type GameHistory = {
  id: string;
  type: GameType;
  winner: Role | 'draw' | null;
  playedAt: FirestoreDate;
  scores?: { me: number; her: number };
};
