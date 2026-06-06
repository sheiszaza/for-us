import { useState } from "react";
import toast from "react-hot-toast";
import type { Role } from "../../types";
import { Button } from "../Button";
import type { GameComponentProps } from "./types";

export function LoveQuizGame({
  game,
  gameContent,
  role,
  getNickname,
  updateGameState,
  endGame,
}: GameComponentProps) {
  const state = game.state.loveQuiz;
  const [input, setInput] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  if (!state) return null;

  const currentQuestion = state.questions[state.currentQuestionIndex];
  const partnerRole: Role = role === "me" ? "her" : "me";
  const isAsker = currentQuestion?.askedBy === role;
  const questions = gameContent.loveQuizQuestions;

  const handleAskQuestion = async (question: string) => {
    if (!role || !input.trim()) {
      toast.error("Please enter your answer");
      return;
    }

    await updateGameState({
      loveQuiz: {
        ...state,
        questions: [
          ...state.questions,
          {
            question,
            answer: input.trim(),
            askedBy: role,
          },
        ],
        phase: "answering",
      },
    });
    setInput("");
    setSelectedQuestion(null);
  };

  const handleGuess = async () => {
    if (!role || !input.trim() || !currentQuestion) return;

    const isCorrect =
      input.trim().toLowerCase() === currentQuestion.answer.toLowerCase();

    const newScores = { ...state.scores };
    if (isCorrect) {
      newScores[role] += 1;
    }

    const newQuestions = [...state.questions];
    newQuestions[state.currentQuestionIndex] = {
      ...currentQuestion,
      guessedAnswer: input.trim(),
      guessedBy: role,
      correct: isCorrect,
    };

    await updateGameState({
      loveQuiz: {
        ...state,
        questions: newQuestions,
        scores: newScores,
        phase: "reveal",
      },
    });
    setInput("");
  };

  const handleNextQuestion = async () => {
    if (state.questions.length >= 6) {
      const winner =
        state.scores.me > state.scores.her
          ? "me"
          : state.scores.her > state.scores.me
          ? "her"
          : "draw";
      await endGame(winner);
      return;
    }

    await updateGameState({
      loveQuiz: {
        ...state,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        phase: "asking",
      },
    });
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-6 text-center">
        <div className="rounded-2xl bg-rose-100 px-4 py-2">
          <p className="text-2xl font-black text-rose-500">{state.scores.me}</p>
          <p className="text-xs font-bold text-rose-400">{getNickname("me")}</p>
        </div>
        <div className="rounded-2xl bg-pink-100 px-4 py-2">
          <p className="text-2xl font-black text-pink-500">
            {state.scores.her}
          </p>
          <p className="text-xs font-bold text-pink-400">
            {getNickname("her")}
          </p>
        </div>
      </div>

      <p className="text-sm text-rose-400">
        Round {Math.min(state.questions.length + 1, 6)} / 6
      </p>

      {state.phase === "asking" && (
        <div className="w-full space-y-4">
          {state.questions.length % 2 === (role === "me" ? 0 : 1) ? (
            <>
              <p className="text-center font-bold text-rose-700">
                Pick a question and answer it secretly:
              </p>
              <div className="grid gap-2">
                {questions.map((q) => (
                  <button
                    key={q}
                    onClick={() => setSelectedQuestion(q)}
                    className={`rounded-xl p-3 text-left text-sm transition ${
                      selectedQuestion === q
                        ? "bg-rose-500 text-white"
                        : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              {selectedQuestion && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Your secret answer..."
                    className="w-full rounded-xl bg-rose-50 px-4 py-3 text-rose-950 placeholder:text-rose-300"
                  />
                  <Button
                    onClick={() => handleAskQuestion(selectedQuestion)}
                    className="w-full"
                  >
                    Submit Question
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-rose-500">
              Waiting for {getNickname(partnerRole)} to pick a question...
            </p>
          )}
        </div>
      )}

      {state.phase === "answering" && currentQuestion && (
        <div className="w-full space-y-4 text-center">
          <p className="text-sm text-rose-400">
            {getNickname(currentQuestion.askedBy)} asks:
          </p>
          <p className="text-xl font-bold text-rose-950">
            {currentQuestion.question}
          </p>
          {!isAsker ? (
            <div className="space-y-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Your guess..."
                className="w-full rounded-xl bg-rose-50 px-4 py-3 text-center text-rose-950 placeholder:text-rose-300"
              />
              <Button onClick={handleGuess} className="w-full">
                Submit Guess
              </Button>
            </div>
          ) : (
            <p className="text-rose-500">
              Waiting for {getNickname(partnerRole)} to guess...
            </p>
          )}
        </div>
      )}

      {state.phase === "reveal" && currentQuestion && (
        <div className="w-full space-y-4 text-center">
          <p className="text-lg font-bold text-rose-950">
            {currentQuestion.question}
          </p>
          <div className="grid gap-3">
            <div className="rounded-xl bg-emerald-100 p-3">
              <p className="text-xs font-bold text-emerald-600">
                Correct Answer
              </p>
              <p className="text-lg font-bold text-emerald-700">
                {currentQuestion.answer}
              </p>
            </div>
            <div
              className={`rounded-xl p-3 ${
                currentQuestion.correct ? "bg-emerald-100" : "bg-rose-100"
              }`}
            >
              <p
                className={`text-xs font-bold ${
                  currentQuestion.correct ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {getNickname(currentQuestion.guessedBy!)}'s Guess
              </p>
              <p
                className={`text-lg font-bold ${
                  currentQuestion.correct ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {currentQuestion.guessedAnswer}
                {currentQuestion.correct ? " ✓" : " ✗"}
              </p>
            </div>
          </div>
          <Button onClick={handleNextQuestion} className="w-full">
            {state.questions.length >= 6 ? "See Results" : "Next Question"}
          </Button>
        </div>
      )}
    </div>
  );
}
