import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { Game } from "../app/components/SearchBox";

const dynamoDB = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

const docClient = DynamoDBDocumentClient.from(dynamoDB);

export interface RuleBookRecord {
  game_id: string;
  quality: number;
  s3_key: string;
  file_size_in_bytes: number;
}

export class RuleBookNotFoundError extends Error {
  constructor(gameId: string) {
    super(`No valid rulebook found for game: ${gameId}`);
    this.name = "RuleBookNotFoundError";
  }
}

export async function getBestRuleBook(gameId: string): Promise<RuleBookRecord> {
  try {
    const command = new QueryCommand({
      TableName: process.env.RULEBOOK_TABLE!,
      KeyConditionExpression: "game_id = :game_id AND quality > :minQuality",
      ExpressionAttributeValues: {
        ":game_id": gameId,
        ":minQuality": 0, // Only get valid PDFs (quality > 0)
      },
      Limit: 1,
      ScanIndexForward: false, // Sort in descending order
    });

    const response = await docClient.send(command);

    if (!response.Items || response.Items.length === 0) {
      throw new RuleBookNotFoundError(gameId);
    }

    const bestRuleBook = response.Items[0] as RuleBookRecord;
    return bestRuleBook;
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    throw error;
  }
}

export async function getAllValidGames(): Promise<Game[]> {
  try {
    const command = new ScanCommand({
      TableName: process.env.RULEBOOK_TABLE!,
      FilterExpression: "quality > :minQuality AND inPinecone = :true",
      ExpressionAttributeValues: {
        ":minQuality": 0, // Only get valid PDFs (quality > 0)
        ":true": true,
      },
    });

    const gameMap = new Map<string, any>();

    let lastEvaluatedKey: any | undefined;

    // Handle pagination
    do {
      if (lastEvaluatedKey) {
        command.input.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await docClient.send(command);

      // Process items and keep only the highest quality item for each game_id
      if (result.Items && result.Items.length > 0) {
        for (const item of result.Items) {
          const gameId = item.game_id;

          // If we haven't seen this game_id yet, or if this item has higher quality
          // than what we've seen before, update the map
          if (
            !gameMap.has(gameId) ||
            item.quality > gameMap.get(gameId).quality
          ) {
            gameMap.set(gameId, item);
          }
        }
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    // Convert the map values to an array
    return Array.from(gameMap.values()).map((rb_record) => {
      return {
        game_id: rb_record.game_id,
        display_name: rb_record.display_name,
        name: (rb_record.old_id as string).split("_")[1],
      };
    });
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    throw error;
  }
}
