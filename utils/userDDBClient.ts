import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb"

const dynamoDB = new DynamoDBClient({
    region: process.env.AWS_REGION
});

const docClient = DynamoDBDocumentClient.from(dynamoDB);

export const tierLimits = {
    free: 5,
    paid: 100
}

type User = {
    userId: string;
    tier: string;
    requestCount: number;
    resetTimestamp: number;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
}

export async function createDefaultUser(userId: string): Promise<User> {
    const defaultUser = {
        userId,
        tier: "free",
        requestCount: 0,
        resetTimestamp: getEndOfDay(new Date()).getTime()
    };

    const putDefaultUserCommand = new PutCommand({
        TableName: process.env.USERS_TABLE,
        Item: defaultUser
    })

    try {
        docClient.send(putDefaultUserCommand)
        console.log(`Created default user ${userId}`)
        return defaultUser;
    } catch (error) {
        console.error("Error creating default user:", error);
        throw error;
    }
}

// Right now this function is what creates the user in the User table
// this gets called in the getUserRequestInfo action on the homepage load, so the record should be there 
// when the user actually makes their first request
// but isn't good design. should probably create the user in Users when they first sign in with Auth.js TODO
export async function getUserRequestInfo(userId: string) {
    const getUserCommand = new GetCommand({
        TableName: process.env.USERS_TABLE,
        Key: { userId }
    })

    try {
        const userResult = await docClient.send(getUserCommand)

        if (!userResult.Item) {
            const defaultUser = await createDefaultUser(userId)
            return defaultUser;
        }

        return userResult.Item;
    } catch (error) {
        console.error("Error fetching user request info:", error);
        throw error;
    }
}

export async function getUserByStripeCustomerId(stripeCustomerId: string) {
    const getUserByStripeCustomerIdCommand = new QueryCommand({
        TableName: process.env.USERS_TABLE,
        IndexName: 'stripeCustomerId-index', 
        KeyConditionExpression: 'stripeCustomerId = :customerId',
        ExpressionAttributeValues: {
            ':customerId': stripeCustomerId,
        }
    })

    

    try {
        const result = await docClient.send(getUserByStripeCustomerIdCommand)
        const user = result.Items?.[0]

        if (!user) {
            console.error(`No user found with Stripe customer ID: ${stripeCustomerId}`);
            return null;
        }

        return user
    } catch (error) {
        console.error("Error fetching user by Stripe customer ID:", error);
        throw error;
    }
}

export async function updateUserRequestCount(userId: string, newCount: number, resetTimestamp: Date) {
    const updateRequestCountRequest = new UpdateCommand({
        TableName: process.env.USERS_TABLE,
        Key: { userId },
        UpdateExpression: "set requestCount = :count, resetTimestamp = :reset",
        ExpressionAttributeValues: {
            ":count": newCount,
            ":reset": resetTimestamp.getTime()
        }
    })

    try {
        await docClient.send(updateRequestCountRequest);
    } catch (error) {
        console.error("Error updating user request count:", error);
        throw error;
    }
}

export async function updateUserTier(userId: string, customerId: string, subscriptionId: string, newTier: string) {
    const updateUserTierRequest = new UpdateCommand({
        TableName: process.env.USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'set tier = :tier, stripeCustomerId = :customerId, stripeSubscriptionId = :subscriptionId',
        ExpressionAttributeValues: {
            ':tier': newTier,
            ':customerId': customerId,
            ':subscriptionId': subscriptionId,
        },
        ReturnValues: 'UPDATED_NEW',
    })
    try {
        await docClient.send(updateUserTierRequest);
    } catch (error) {
        console.error("Error updating user tier:", error);
        throw error;
    }
}

// Helper function to get timestamp for end of current day
export function getEndOfDay(date: Date) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
}