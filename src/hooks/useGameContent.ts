import { useMemo } from "react";
import { DEFAULT_GAME_CONTENT } from "../components/games/constants";
import type { GameContent } from "../types";
import { useRealtimeDoc } from "./useRealtimeDoc";

const mergeGameContent = (content: GameContent | null): GameContent => ({
  ...DEFAULT_GAME_CONTENT,
  ...content,
  loveQuizQuestions:
    content?.loveQuizQuestions ?? DEFAULT_GAME_CONTENT.loveQuizQuestions,
  wouldYouRatherQuestions:
    content?.wouldYouRatherQuestions ??
    DEFAULT_GAME_CONTENT.wouldYouRatherQuestions,
  truths: content?.truths ?? DEFAULT_GAME_CONTENT.truths,
  dares: content?.dares ?? DEFAULT_GAME_CONTENT.dares,
  wordGuessWords: content?.wordGuessWords ?? DEFAULT_GAME_CONTENT.wordGuessWords,
  coupleEmojis: content?.coupleEmojis ?? DEFAULT_GAME_CONTENT.coupleEmojis,
  typingPhrases: content?.typingPhrases ?? DEFAULT_GAME_CONTENT.typingPhrases,
});

export function useGameContent() {
  const { data, loading, error } = useRealtimeDoc<GameContent>(
    "gameContent",
    "default"
  );

  const gameContent = useMemo(() => mergeGameContent(data), [data]);

  return {
    gameContent,
    loading,
    error,
    usingDefaults: !data,
  };
}
