import type { GameContent, RockPaperScissorsChoice } from "../../types";

export const COUPLE_EMOJIS = [
  "💕",
  "💖",
  "💗",
  "💓",
  "💘",
  "💝",
  "🥰",
  "😘",
  "🌹",
  "🦋",
  "✨",
  "🌸",
  "💐",
  "🍫",
  "🎀",
  "💌",
  "🧸",
  "🍰",
  "🌙",
  "⭐",
];

export const LOVE_QUIZ_QUESTIONS = [
  "What's my favorite food?",
  "What's my biggest fear?",
  "What's my dream vacation destination?",
  "What's my favorite movie?",
  "What makes me laugh the most?",
  "What's my hidden talent?",
  "What's my favorite way to relax?",
  "What's my most embarrassing moment?",
  "What's my favorite song?",
  "What do I love most about you?",
];

export const WOULD_YOU_RATHER_QUESTIONS = [
  {
    optionA: "Always have to sing instead of speaking",
    optionB: "Always have to dance instead of walking",
  },
  {
    optionA: "Live in a treehouse",
    optionB: "Live in a houseboat",
  },
  {
    optionA: "Have unlimited pizza for life",
    optionB: "Have unlimited ice cream for life",
  },
  {
    optionA: "Be able to talk to animals",
    optionB: "Be able to speak all languages",
  },
  {
    optionA: "Have a personal chef",
    optionB: "Have a personal masseuse",
  },
  {
    optionA: "Go on a surprise trip",
    optionB: "Plan every detail of your trip",
  },
  {
    optionA: "Watch only romantic comedies forever",
    optionB: "Watch only action movies forever",
  },
  {
    optionA: "Have breakfast in bed every day",
    optionB: "Have a home cooked dinner every night",
  },
];

export const TRUTHS = [
  "What was your first impression of me?",
  "What's the most romantic thing you've ever done?",
  "What's one thing I do that always makes you smile?",
  "What's your favorite memory of us?",
  "What do you find most attractive about me?",
  "What's something you've never told me?",
  "What's your biggest relationship fear?",
  "When did you know you loved me?",
  "What's your favorite thing about our relationship?",
  "What's one thing you want us to do together?",
];

export const DARES = [
  "Give me a 30-second massage",
  "Do your best impression of me",
  "Send me the most romantic text you can write",
  "Sing the chorus of our song",
  "Give me three genuine compliments",
  "Do a silly dance for 15 seconds",
  "Tell me your favorite thing about today",
  "Give me a surprise kiss within the next minute",
  "Make up a short poem about us",
  "Show me the last photo you took of me",
];

export const FIVE_LETTER_WORDS = [
  "HEART",
  "LOVE",
  "SWEET",
  "SMILE",
  "HAPPY",
  "DREAM",
  "BLISS",
  "KISS",
  "HUG",
  "DEAR",
  "ANGEL",
  "PEACE",
  "CHARM",
  "GRACE",
  "LIGHT",
];

export const RPS_OPTIONS: {
  choice: RockPaperScissorsChoice;
  emoji: string;
  label: string;
  beats: RockPaperScissorsChoice;
}[] = [
  { choice: "rock", emoji: "🪨", label: "Rock", beats: "scissors" },
  { choice: "paper", emoji: "📄", label: "Paper", beats: "rock" },
  { choice: "scissors", emoji: "✂️", label: "Scissors", beats: "paper" },
];

export const TYPING_PHRASES = [
  "I love you more than words can say",
  "You make my heart skip a beat",
  "Together forever and always",
  "You are my sunshine",
  "Every moment with you is precious",
  "My heart belongs to you",
  "You complete me in every way",
  "Love is all we need",
  "You are my favorite person",
  "Forever yours truly",
  "Hugs and kisses for you",
  "You light up my world",
  "My love for you grows daily",
  "You are simply the best",
  "Together we are unstoppable",
  "You make everything better",
  "My heart beats for you",
  "You are my happy place",
  "Soulmates forever",
  "You are my everything",
];

export const DEFAULT_GAME_CONTENT: GameContent = {
  loveQuizQuestions: LOVE_QUIZ_QUESTIONS,
  wouldYouRatherQuestions: WOULD_YOU_RATHER_QUESTIONS,
  truths: TRUTHS,
  dares: DARES,
  wordGuessWords: FIVE_LETTER_WORDS,
  coupleEmojis: COUPLE_EMOJIS,
  typingPhrases: TYPING_PHRASES,
};

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
