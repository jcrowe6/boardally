import { auth } from "auth";
import { redirect } from "next/navigation";
import { getUserRequestInfo, tierLimits } from "utils/userDDBClient";
import AccountClient from "./AccountClient";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const userInfo = await getUserRequestInfo(session.user.id);

  return (
    <div className="bg-app-background min-h-screen flex justify-center items-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl text-center font-bold mb-8 text-primary-text font-title">
          Account
        </h1>

        <div className="bg-primary-container bg-opacity-overlay backdrop-blur-sm rounded-lg shadow-lg p-6 border border-primary-container-border">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-primary-text mb-2">
              Account Details
            </h2>
            <p className="text-primary-text">{session.user.email}</p>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-medium text-primary-text mb-2">
              Current Plan
            </h2>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  userInfo.tier === "paid"
                    ? "bg-green-600 text-white"
                    : "bg-gray-600 text-white"
                }`}
              >
                {userInfo.tier === "paid" ? "Premium" : "Free"}
              </span>
              <span className="text-primary-text text-sm">
                {tierLimits[userInfo.tier as keyof typeof tierLimits]} requests/day
              </span>
            </div>
          </div>

          <AccountClient
            tier={userInfo.tier}
            hasStripeCustomer={!!userInfo.stripeCustomerId}
          />
        </div>
      </div>
    </div>
  );
}
