"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import SearchBox, { Game } from "./SearchBox";
import AnswerDisplay from "./AnswerDisplay";

interface QueryBoxProps {
  userUsage: {
    requestCount: number;
    tier: string;
    requestLimit: number;
  } | null;
  initialGames?: Game[];
}

export default function QueryBox({ userUsage, initialGames = [] }: QueryBoxProps) {
  const [answer, setAnswer] = useState("");
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [userRequestsToday, setUserRequestsToday] = useState(
    userUsage?.requestCount ?? 0
  );
  const [showAnswer, setShowAnswer] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  // Scroll answer into view when it appears
  useEffect(() => {
    if (showAnswer && answerRef.current) {
      answerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showAnswer]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorStatus(null);
    setIsLoading(true);
    setIsStreaming(false);
    setShowAnswer(false);
    setAnswer("");

    const formData = new FormData(event.currentTarget);
    const formDataJson = JSON.stringify(Object.fromEntries(formData));

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: formDataJson,
      });

      if (!response.ok) {
        setErrorStatus(response.status);
        setShowAnswer(true);
        setIsLoading(false);
        return;
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      setShowAnswer(true);
      setIsStreaming(true);
      setUserRequestsToday(userRequestsToday + 1);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        setAnswer((prev) => prev + text);
      }

      setIsStreaming(false);
    } catch (error) {
      console.error(error);
      setErrorStatus(500);
      setShowAnswer(true);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }

  function getErrorMessage(status: number | null) {
    if (status === 400 || status === 422) {
      return "Sorry, we can't process that question.";
    } else if (status === 429) {
      if (!userUsage) {
        return "Request limit reached. Consider signing up for a free account to increase your limit!";
      } else if (userUsage?.tier === "free") {
        return "You have reached the free usage limit.";
      }
      return "Too many requests";
    }
    return "Sorry, there's been an error. Please try again.";
  }

  function getErrorStyle(status: number | null) {
    if (status === 400 || status === 422) {
      return "bg-warning-background text-warning-text border border-warning-border";
    } else if (status === 429) {
      return "bg-notice-background text-notice-text border border-notice-border";
    }
    return "bg-critical-background text-critical-text border border-critical-border";
  }

  return (
    <>
      {userUsage && (
        <div className="mb-4 rounded-lg p-3 bg-primary-container bg-opacity-medium border border-primary-container-border">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <span className="text-primary-text font-medium mr-2">
                {`${userUsage.tier.charAt(0).toUpperCase() + userUsage.tier.slice(1)} Account:`}
              </span>
              <span className="text-primary-text">
                {userRequestsToday} / {userUsage.requestLimit} requests used
                today
              </span>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-button-background h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, ((userRequestsToday ?? 0) / userUsage.requestLimit) * 100)}%`,
              }}
            ></div>
          </div>
        </div>
      )}
      <div className="bg-primary-container bg-opacity-overlay backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6 border border-primary-container-border">
        <form onSubmit={onSubmit} className="flex flex-col">
          <div className="mb-5">
            <SearchBox initialGames={initialGames} />
          </div>

          <div className="mb-5">
            <textarea
              name="question"
              placeholder="What's your question?"
              autoComplete="off"
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = target.scrollHeight + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const form = e.currentTarget.form;
                  if (form) {
                    form.requestSubmit();
                  }
                }
              }}
              className="w-full px-4 py-3 rounded-md border border-input-border bg-input-background bg-opacity-medium focus:outline-none focus:ring-2 focus:ring-input-focus-ring focus:border-transparent transition-all text-primary-text placeholder-placeholder-text resize-none overflow-hidden min-h-[48px]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="bg-button-background text-white font-medium py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {isStreaming ? "Generating answer..." : "Searching rulebooks..."}
              </span>
            ) : (
              "Ask Question"
            )}
          </button>
        </form>
      </div>

      {/* Answer section with scroll margin */}
      <div ref={answerRef} className="scroll-mt-4">
        {/* Error display */}
        {errorStatus && (
          <div
            className={`p-6 rounded-lg transform transition-all duration-300 ease-out ${
              showAnswer ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            } ${getErrorStyle(errorStatus)}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="text-lg font-semibold">Error</h2>
            </div>
            <p className="text-base">{getErrorMessage(errorStatus)}</p>
          </div>
        )}

        {/* Answer display */}
        {answer && !errorStatus && (
          <AnswerDisplay
            answer={answer}
            isStreaming={isStreaming}
            isVisible={showAnswer}
          />
        )}
      </div>
    </>
  );
}
