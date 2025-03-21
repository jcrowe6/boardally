"use client"

import React, { FormEvent, useState } from "react";
import SearchBox from "./components/SearchBox";

export default function Home() {
    const [answer, setAnswer] = useState("");
    const [errorStatus, setErrorStatus] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorStatus(null);
        setIsLoading(true);

        const formData = new FormData(event.currentTarget);
        const formDataJson = JSON.stringify(Object.fromEntries(formData));

        try {
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: formDataJson,
            });

            if (!response.ok) {
                console.error(response.statusText);
                setErrorStatus(response.status);
                return;
            }

            const data = await response.json();
            setAnswer(data["answer"]);
        } catch (error) {
            console.error(error);
            setErrorStatus(500);
        } finally {
            setIsLoading(false);
        }
    }

    function getErrorMessage(status: number | null) {
        if (status === 400 || status === 422) {
            return "Sorry, we can't process that question.";
        } else if (status === 429) {
            return "You are out of free questions for now. Please try again later."
        }
        return "Sorry, there's been an error. Please try again.";
    }

    function getErrorStyle(status: number | null) {
        if (status === 400 || status === 422) {
            return "bg-warning-background text-warning-text border border-warning-border";
        } else if (status === 429) {
            return "bg-notice-background text-notice-text border border-notice-border'"
        }
        return "bg-critical-background text-critical-text border border-critical-border";
    }

    return (
        <div className="bg-app-background min-h-screen bg-opacity-90 flex md:justify-center items-center flex-col px-4">
            <div className="w-full max-w-md pt-40 md:pt-0">
                <h1 className="text-5xl md:text-6xl text-center font-bold mb-8 text-primary-text font-title">
                    Boardally
                </h1>

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
                                className="w-full px-4 py-3 rounded-md border border-input-border bg-input-background bg-opacity-medium focus:outline-none focus:ring-2 focus:ring-input-focus-ring focus:border-transparent transition-all text-primary-text placeholder-placeholder-text"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-button-background text-white font-medium py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all transform hover:scale-105"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-light" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-semi" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
                            ) : "Submit"}
                        </button>
                    </form>
                </div>

                {(answer || errorStatus) && (
                    <div className={`p-6 rounded-lg ${errorStatus ? getErrorStyle(errorStatus) : 'bg-primary-container bg-opacity-overlay text-primary-text border border-primary-container-border'}`}>
                        <h2 className="text-lg font-medium mb-2">
                            {errorStatus ? "Error" : "Answer"}
                        </h2>
                        <p className="text-lg">
                            {errorStatus ? getErrorMessage(errorStatus) : answer}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}