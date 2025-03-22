import { fetchUserUsage } from "../actions/usage";

export default async function UsageBar() {
    // If initial usage is provided, use it; otherwise fetch
    const userUsage = await fetchUserUsage();

    if (!userUsage) {
        return null;
    }

    return (
        <div className="mb-4 rounded-lg p-3 bg-primary-container bg-opacity-medium border border-primary-container-border">
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                    <span className="font-medium mr-2">
                            {`${userUsage.tier.charAt(0).toUpperCase() + userUsage.tier.slice(1)} Account:`}
                    </span>
                    <span>
                        {userUsage.requestCount} / {userUsage.requestLimit} requests used today
                    </span>
                </div>
                {userUsage.tier === "free" && (
                    <a href="/upgrade" className="text-button-background hover:underline font-medium">
                        Upgrade
                    </a>
                )}
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                    className="bg-button-background h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, (userUsage.requestCount / userUsage.requestLimit) * 100)}%` }}
                ></div>
            </div>
        </div>
    );
}