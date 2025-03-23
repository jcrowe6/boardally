'use server'

import { auth } from "auth";
import { getUserRequestInfo, tierLimits } from "utils/userDDBClient";

export async function fetchUserUsage() {
    const session = await auth();
    if (!session?.user?.id) {
        return null;
    }

    try {
        const userInfo = await getUserRequestInfo(session.user.id);
        const now = new Date();
        const resetTime = new Date(userInfo.resetTimestamp);
        if (now.getTime() > resetTime.getTime()) {
            // New day, show user 0 (it will reset on the backend when they send a request)
            return {
                requestCount: 0,
                tier: userInfo.tier,
                requestLimit: tierLimits[userInfo.tier]
            };
        } else {
            return {
                requestCount: userInfo.requestCount,
                tier: userInfo.tier,
                requestLimit: tierLimits[userInfo.tier]
            };
        }
    } catch (error) {
        console.error("Error fetching usage data:", error);
        return null;
    }
}