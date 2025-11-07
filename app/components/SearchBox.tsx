"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";

export type Game = {
  display_name: string;
  game_id: string;
};

export default function SearchBox() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [query, setQuery] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Debounced search with useCallback
  const fetchResults = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/search?query=${encodeURIComponent(searchQuery)}`
      );
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      const data = await response.json();
      setGames(data);
    } catch (error) {
      console.error("Error fetching search results:", error);
      setGames([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch initial results on mount
  useEffect(() => {
    fetchResults("");
  }, [fetchResults]);

  // Handle search input changes with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchResults(query);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query, fetchResults]);

  const handleChange = (game: Game | null) => {
    if (game) {
      setSelectedGame(game);
    }
  };

  return (
    <Combobox name="selectedGame" value={selectedGame} onChange={handleChange}>
      <div className="relative w-full">
        <ComboboxInput
          displayValue={(game: Game) => game?.display_name}
          placeholder="What game are you playing?"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          className={clsx(
            "w-full h-12 rounded-lg border-none bg-gray-800 text-white px-4 text-base",
            "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25"
          )}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="animate-spin h-5 w-5 text-white/50"
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
          </div>
        )}
      </div>
      <ComboboxOptions
        anchor="bottom"
        transition
        className={clsx(
          "w-[var(--input-width)] rounded-xl border border-white/10 bg-gray-900 p-1 [--anchor-gap:4px] empty:invisible",
          "transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0",
          "shadow-lg shadow-black/20"
        )}
      >
        {games.length === 0 && !isLoading ? (
          <div className="py-1.5 px-3 text-sm text-gray-400">
            No results found
          </div>
        ) : (
          games.map((game) => (
            <ComboboxOption
              key={game.game_id}
              value={game}
              className="group flex cursor-default items-center gap-2 rounded-lg py-1.5 px-3 select-none data-[focus]:bg-gray-800"
            >
              <div className="text-sm/6 text-white">{game.display_name}</div>
            </ComboboxOption>
          ))
        )}
      </ComboboxOptions>
    </Combobox>
  );
}
