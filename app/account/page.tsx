"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import SubscriptionButton from "../components/SubscriptionButton";
import { getUserRequestInfo, tierLimits } from "utils/userDDBClient";
import { fetchUserUsage } from "app/actions/usage";
import AccountPortalButton from "app/components/AccountPortalButton";

function ActionResult() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  if (success) {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        Subscription successful! Your account has been upgraded.
      </div>
    );
  }

  if (canceled) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        Subscription process was canceled.
      </div>
    );
  }

  return null;
}

export default function SubscriptionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userTier, setUserTier] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
      return;
    }

    if (status === "authenticated" && session.user) {
      fetchUserData();
    }
  }, [status, session]);

  const fetchUserData = async () => {
    try {
      const userData = await fetchUserUsage();
      if (!userData) {
        throw new Error("User data not found");
      }
      setUserTier(userData.tier);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-opacity-90 flex md:justify-center items-center flex-col px-4 md:mt-0 mt-25">
      <h1 className="text-3xl text-primary-text font-bold mb-6">
        Account Management
      </h1>

      <Suspense>
        <ActionResult />
      </Suspense>

      <div className="bg-primary-container shadow-md rounded-lg p-8 mb-6 text-primary-text">
        <h2 className="text-xl font-semibold mb-4">Your Current Plan</h2>
        <div className="mb-6">
          <span className="font-medium ">Current Tier:</span>{" "}
          {loading ? (
            <span className="inline-flex items-center gap-2">
              Loading...
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-light"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-semi"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </span>
          ) : userTier === "paid" ? (
            "Premium"
          ) : (
            "Free"
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-primary-text">
          <div className="border rounded-lg p-6 ">
            <h3 className="text-lg font-medium mb-2">Free Tier</h3>
            <ul className="mb-4">
              <li className="flex items-center mb-2">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{tierLimits["free"]} requests per day</span>
              </li>
            </ul>
          </div>

          <div className="border rounded-lg p-6 bg-notice-background">
            <h3 className="text-lg font-medium mb-2">Premium Tier</h3>
            <ul className="mb-4">
              <li className="flex items-center mb-2">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>100 requests per day</span>
              </li>
              <li className="flex items-center mb-2">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Priority Support</span>
              </li>
              <h3 className="text-md font-medium mb-2">Coming soon</h3>
              <li className="flex items-center mb-2">
                <svg
                  className="w-5 h-5 mr-2 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8V6a.75.75 0 011.5 0v3.25H13a.75.75 0 010 1.5h-3.75A.75.75 0 019.25 10z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Image Context Upload</span>
              </li>
            </ul>
            <p className="text-lg font-bold mb-4">$0.99/month</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          {loading ? (
            <span className="inline-flex">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-light"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-semi"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </span>
          ) : userTier === "paid" ? (
            <AccountPortalButton />
          ) : (
            <SubscriptionButton />
          )}
        </div>
      </div>
    </div>
  );
}
