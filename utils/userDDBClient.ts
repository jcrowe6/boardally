import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"

const dynamoDB = new DynamoDBClient({
    region: process.env.AWS_REGION
});

const docClient = DynamoDBDocumentClient.from(dynamoDB);

export const tierLimits = {
    free: 5,
    paid: 100
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

            await docClient.send(putDefaultUserCommand)
            console.log(`Created default user ${userId}`)
            return defaultUser;
        }

        return userResult.Item;
    } catch (error) {
        console.error("Error fetching user request info:", error);
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

// Helper function to get timestamp for end of current day
export function getEndOfDay(date: Date) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
}