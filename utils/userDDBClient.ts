import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const dynamoDB = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(dynamoDB);

export interface UserInfo {
  userId: string;
  tier: "free" | "paid";
  requestCount: number;
  resetTimestamp: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export const tierLimits: Record<"free" | "paid", number> = {
  free: 5,
  paid: 100,
};

export async function createUser(userId: string): Promise<UserInfo> {
  const newUser: UserInfo = {
    userId,
    tier: "free",
    requestCount: 0,
    resetTimestamp: getEndOfDay(new Date()).getTime(),
  };

  const putCommand = new PutCommand({
    TableName: process.env.USERS_TABLE,
    Item: newUser,
    ConditionExpression: "attribute_not_exists(userId)",
  });

  try {
    await docClient.send(putCommand);
    console.log(`Created user ${userId} in Users table`);
    return newUser;
  } catch (error: unknown) {
    // If user already exists, that's fine - just fetch and return
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      console.log(`User ${userId} already exists in Users table`);
      const existingUser = await getUserRequestInfo(userId);
      return existingUser;
    }
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function getUserRequestInfo(userId: string): Promise<UserInfo> {
  const getUserCommand = new GetCommand({
    TableName: process.env.USERS_TABLE,
    Key: { userId },
  });

  try {
    const userResult = await docClient.send(getUserCommand);

    if (!userResult.Item) {
      // User should be created at sign-in, but create as fallback for existing users
      return createUser(userId);
    }

    return userResult.Item as UserInfo;
  } catch (error) {
    console.error("Error fetching user request info:", error);
    throw error;
  }
}

export async function updateUserRequestCount(
  userId: string,
  newCount: number,
  resetTimestamp: Date
) {
  const updateRequestCountRequest = new UpdateCommand({
    TableName: process.env.USERS_TABLE,
    Key: { userId },
    UpdateExpression: "set requestCount = :count, resetTimestamp = :reset",
    ExpressionAttributeValues: {
      ":count": newCount,
      ":reset": resetTimestamp.getTime(),
    },
  });

  try {
    await docClient.send(updateRequestCountRequest);
  } catch (error) {
    console.error("Error updating user request count:", error);
    throw error;
  }
}

// Helper function to get timestamp for end of current day
export function getEndOfDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export async function updateUserStripeInfo(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  tier: "free" | "paid"
) {
  const updateCommand = new UpdateCommand({
    TableName: process.env.USERS_TABLE,
    Key: { userId },
    UpdateExpression:
      "set stripeCustomerId = :customerId, stripeSubscriptionId = :subId, tier = :tier",
    ExpressionAttributeValues: {
      ":customerId": stripeCustomerId,
      ":subId": stripeSubscriptionId,
      ":tier": tier,
    },
  });

  try {
    await docClient.send(updateCommand);
  } catch (error) {
    console.error("Error updating user stripe info:", error);
    throw error;
  }
}

export async function updateUserTier(userId: string, tier: "free" | "paid") {
  const updateCommand = new UpdateCommand({
    TableName: process.env.USERS_TABLE,
    Key: { userId },
    UpdateExpression: "set tier = :tier",
    ExpressionAttributeValues: {
      ":tier": tier,
    },
  });

  try {
    await docClient.send(updateCommand);
  } catch (error) {
    console.error("Error updating user tier:", error);
    throw error;
  }
}

export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  // Note: This requires a scan since stripeCustomerId is not the PK
  // For production, consider adding a GSI on stripeCustomerId
  const { ScanCommand } = await import("@aws-sdk/lib-dynamodb");

  const scanCommand = new ScanCommand({
    TableName: process.env.USERS_TABLE,
    FilterExpression: "stripeCustomerId = :customerId",
    ExpressionAttributeValues: {
      ":customerId": stripeCustomerId,
    },
  });

  try {
    const result = await docClient.send(scanCommand);
    return result.Items?.[0] || null;
  } catch (error) {
    console.error("Error finding user by stripe customer ID:", error);
    throw error;
  }
}
