"use client";

import { useSearchParams } from "next/navigation";

export default function ActionResult() {
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
