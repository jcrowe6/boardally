"use server";

import { getAllValidGames } from "utils/rulebookDDBClient";
import { Game } from "app/components/SearchBox";

// Cache for games list - shared across server action calls
let gamesCache: {
  games: Game[] | null;
  timestamp: number;
} = {
  games: null,
  timestamp: 0,
};

const CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds

export async function fetchInitialGames(): Promise<Game[]> {
  const now = Date.now();

  // Return cached games if still valid
  if (gamesCache.games && now - gamesCache.timestamp < CACHE_TTL) {
    return gamesCache.games.slice(0, 20);
  }

  try {
    const allGames = await getAllValidGames();

    // Update cache
    gamesCache = {
      games: allGames,
      timestamp: now,
    };

    return allGames.slice(0, 20);
  } catch (error) {
    console.error("Error fetching initial games:", error);
    return [];
  }
}
