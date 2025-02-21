import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb"

const dynamoDB = new DynamoDBClient({
  region: process.env.AWS_REGION
});

const docClient = DynamoDBDocumentClient.from(dynamoDB);

export interface RuleBookRecord {
  game_id: string;
  quality: number;
  s3_key: string;
}

export class RuleBookNotFoundError extends Error {
    constructor(gameId: string) {
        super(`No valid rulebook found for game: ${gameId}`);
        this.name = 'RuleBookNotFoundError';
    }
}

export async function getBestRuleBookKey(gameId: string): Promise<string> {
  try {
    const command = new QueryCommand({
      TableName: process.env.RULEBOOK_TABLE!,
      KeyConditionExpression: 'game_id = :game_id AND quality > :minQuality',
      ExpressionAttributeValues: {
        ':game_id': gameId,
        ':minQuality': 0, // Only get valid PDFs (quality > 0)
      },
      Limit: 1,
      ScanIndexForward: false, // Sort in descending order
    });

    const response = await docClient.send(command);
    
    if (!response.Items || response.Items.length === 0) {
      throw new RuleBookNotFoundError(gameId)
    }

    const bestRuleBook = response.Items[0] as RuleBookRecord;
    return bestRuleBook.s3_key;
  } catch (error) {
    console.error('Error querying DynamoDB:', error);
    throw error;
  }
}