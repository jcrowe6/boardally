"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

interface AccountClientProps {
  tier: string;
  hasStripeCustomer: boolean;
}

export default function AccountClient({
  tier,
  hasStripeCustomer,
}: AccountClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  async function handleSubscribe() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
    }
  }

  async function handleManageBilling() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
    }
  }

  return (
    <>
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-600 text-white">
          Subscription successful! Welcome to Premium.
        </div>
      )}

      {canceled && (
        <div className="mb-4 p-3 rounded-lg bg-warning-background text-warning-text">
          Subscription was canceled.
        </div>
      )}

      {tier === "free" ? (
        <div>
          <p className="text-primary-text text-sm mb-4">
            Upgrade to Premium for 100 requests per day.
          </p>
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full bg-button-background text-white font-medium py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Subscribe to Premium"
            )}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-primary-text text-sm mb-4">
            Manage your subscription, update payment methods, or cancel.
          </p>
          <button
            onClick={handleManageBilling}
            disabled={isLoading || !hasStripeCustomer}
            className="w-full bg-button-background text-white font-medium py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Manage Billing"
            )}
          </button>
        </div>
      )}
    </>
  );
}
