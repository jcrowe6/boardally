import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { getEndOfDay } from "./userDDBClient";

const dynamoDB = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

const docClient = DynamoDBDocumentClient.from(dynamoDB);

export async function getAnonymousRequestCount(anonKey: string) {
  const getAnonRequestsCommand = new GetCommand({
    TableName: process.env.ANON_TABLE,
    Key: { anonKey },
  });

  try {
    const result = await docClient.send(getAnonRequestsCommand);

    if (!result.Item) {
      // New anonymous user
      const defaultAnon = {
        anonKey,
        requestCount: 0,
        resetTimestamp: getEndOfDay(new Date()).getTime(),
        ttl: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 1, // 1 day ttl
      };

      await docClient.send(
        new PutCommand({
          TableName: process.env.ANON_TABLE,
          Item: defaultAnon,
        }),
      );

      return defaultAnon;
    }

    return result.Item;
  } catch (error) {
    console.error("Error fetching anonymous request info:", error);
    throw error;
  }
}

export async function updateAnonymousRequestCount(
  anonKey: string,
  newCount: number,
  resetTimestamp: Date,
) {
  const updateAnonymousRequestCount = new UpdateCommand({
    TableName: process.env.ANON_TABLE,
    Key: { anonKey },
    UpdateExpression: "set requestCount = :count, resetTimestamp = :reset",
    ExpressionAttributeValues: {
      ":count": newCount,
      ":reset": resetTimestamp.getTime(),
    },
  });

  try {
    await docClient.send(updateAnonymousRequestCount);
  } catch (error) {
    console.error("Error updating anonymous request count:", error);
    throw error;
  }
}
