"use client";

import ReactMarkdown from "react-markdown";

interface AnswerDisplayProps {
  answer: string;
  isStreaming: boolean;
  isVisible: boolean;
}

export default function AnswerDisplay({
  answer,
  isStreaming,
  isVisible,
}: AnswerDisplayProps) {
  return (
    <div
      className={`p-6 rounded-lg transform transition-all duration-300 ease-out bg-primary-container bg-opacity-overlay text-primary-text border border-primary-container-border ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-5 h-5 text-button-background"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <h2 className="text-lg font-semibold">Answer</h2>
      </div>

      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <p className="mb-3 leading-relaxed text-primary-text last:mb-0">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="mb-3 ml-4 list-disc space-y-1 text-primary-text">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-3 ml-4 list-decimal space-y-1 text-primary-text">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed">{children}</li>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-white">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic text-primary-text/90">{children}</em>
            ),
            code: ({ children }) => (
              <code className="px-1.5 py-0.5 rounded bg-gray-800 text-sm font-mono text-green-400">
                {children}
              </code>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-button-background pl-4 italic text-primary-text/80 my-3">
                {children}
              </blockquote>
            ),
            h1: ({ children }) => (
              <h1 className="text-xl font-bold mb-2 text-white">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-bold mb-2 text-white">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-bold mb-2 text-white">{children}</h3>
            ),
          }}
        >
          {answer}
        </ReactMarkdown>
        {isStreaming && (
          <span className="inline-block w-2 h-5 ml-0.5 bg-button-background animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
}
