"use client";

import { FormEvent, useState } from "react";
import SearchBox from "./SearchBox";

export default function QueryBox({ userUsage }) {
  const [answer, setAnswer] = useState("");
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userRequestsToday, setUserRequestsToday] = useState(
    userUsage?.requestCount
  );
  const [showAnswer, setShowAnswer] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorStatus(null);
    setIsLoading(true);
    setShowAnswer(false);

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
        setTimeout(() => setShowAnswer(true), 100);
        return;
      }

      const data = await response.json();
      setAnswer(data["answer"]);
      setUserRequestsToday(userRequestsToday + 1);
      setTimeout(() => setShowAnswer(true), 100);
    } catch (error) {
      console.error(error);
      setErrorStatus(500);
      setTimeout(() => setShowAnswer(true), 100);
    } finally {
      setIsLoading(false);
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
            {/* {userUsage.tier === "free" && (
                            <a href="/upgrade" className="text-button-background hover:underline font-medium">
                                Upgrade
                            </a>
                        )} */}
          </div>

          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-button-background h-1.5 rounded-full"
              style={{
                width: `${Math.min(100, (userRequestsToday / userUsage.requestLimit) * 100)}%`,
              }}
            ></div>
          </div>
        </div>
      )}
      <div className="bg-primary-container bg-opacity-overlay backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6 border border-primary-container-border">
        <form onSubmit={onSubmit} className="flex flex-col">
          <div className="mb-5">
            <SearchBox />
          </div>

          <div className="mb-5">
            <input
              name="question"
              type="text"
              placeholder="What's your question?"
              autoComplete="off"
              className="w-full px-4 py-3 rounded-md border border-input-border bg-input-background bg-opacity-medium focus:outline-none focus:ring-2 focus:ring-input-focus-ring focus:border-transparent transition-all text-primary-text placeholder-placeholder-text"
            />
          </div>

          <button
            type="submit"
            className="bg-button-background text-white font-medium py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
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
                    className="opacity-light"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-semi"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Submit"
            )}
          </button>
        </form>
      </div>

      {(answer || errorStatus) && (
        <div
          className={`p-6 rounded-lg transform transition-all duration-500 ease-out ${
            showAnswer ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          } ${
            errorStatus
              ? getErrorStyle(errorStatus)
              : "bg-primary-container bg-opacity-overlay text-primary-text border border-primary-container-border"
          }`}
        >
          <h2 className="text-lg font-medium mb-2">
            {errorStatus ? "Error" : "Answer"}
          </h2>
          <p className="text-lg">
            {errorStatus ? getErrorMessage(errorStatus) : answer}
          </p>
        </div>
      )}
    </>
  );
}
