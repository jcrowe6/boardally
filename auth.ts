import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { DynamoDB, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDBAdapter } from "@auth/dynamodb-adapter";
import { getUserRequestInfo } from "utils/userDDBClient";

const providers: Provider[] = [Google];

export const providerMap = providers
  .map((provider) => {
    if (typeof provider === "function") {
      const providerData = provider();
      return { id: providerData.id, name: providerData.name };
    } else {
      return { id: provider.id, name: provider.name };
    }
  })
  .filter((provider) => provider.id !== "credentials");

const config: DynamoDBClientConfig = {
  credentials: {
    accessKeyId: process.env.AUTH_DYNAMODB_ID ?? "",
    secretAccessKey: process.env.AUTH_DYNAMODB_SECRET ?? "",
  },
  region: process.env.AUTH_DYNAMODB_REGION,
};

const client = DynamoDBDocument.from(new DynamoDB(config), {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  adapter: DynamoDBAdapter(client, {
    tableName: process.env.NEXT_AUTH_TABLE_NAME,
  }),
  callbacks: {
    async signIn({ user }) {
      // Create user record in Users table on first sign-in
      if (user.id) {
        try {
          // getUserRequestInfo creates the user if they don't exist
          await getUserRequestInfo(user.id);
        } catch (error) {
          console.error("Error creating user record on sign-in:", error);
          // Don't block sign-in if user creation fails - it will be created on first request
        }
      }
      return true;
    },
  },
});
