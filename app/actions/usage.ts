'use server'

import { auth } from "auth";
import { getUserRequestInfo } from "utils/userDDBClient";

export async function fetchUserUsage() {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }

    try {
        const response = await getUserRequestInfo(session.user.id);
        return {
            requestCount: response.requestCount,
            tier: response.tier,
            requestLimit: response.tier === "paid" ? 100 : 10
        };
    } catch (error) {
        console.error("Error fetching usage data:", error);
        return null;
    }
}