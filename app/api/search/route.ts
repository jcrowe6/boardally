import { NextResponse } from 'next/server';
import { getAllValidGames } from '../../../utils/dynamoDBclient';
import { Game } from '../../components/SearchBox';

const CACHE_TTL = 3600; // Cache TTL in seconds (1 hour)

let inMemoryCache: {
    allGames?: Game[];
    timestamp?: number;
} = {};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';

    // Try to get all games from cache first
    let allGames;

    try {
        if (inMemoryCache.allGames &&
            (Date.now() - (inMemoryCache.timestamp || 0)) < CACHE_TTL * 1000) {
            allGames = inMemoryCache.allGames;
            console.log('Using in-memory cache');
        }
    } catch (error) {
        console.error('Cache error:', error);
    }

    // If not in cache, fetch from database
    if (!allGames) {
        console.log('Cache miss, fetching from database');

        // Query DynamoDB
        allGames = await getAllValidGames();

        // Store in cache
        try {
            inMemoryCache = {
                allGames,
                timestamp: Date.now(),
            };
        } catch (error) {
            console.error('Cache write error:', error);
        }
    }

    // Now filter the results based on query
    let filteredGames;

    if (query.length === 0) {
        // Return first 20 items for empty query
        filteredGames = allGames.slice(0, 20);
    } else {
        // TODO: cache here too. Set up redis
        if (!filteredGames) {
            // Simple filter by match
            filteredGames = allGames.filter((game) =>
                game.display_name.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 20); // Limit to 20 results
        }
    }

    return NextResponse.json(filteredGames);
}
