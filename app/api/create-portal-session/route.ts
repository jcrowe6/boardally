import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { stripe } from "../../../lib/stripe";
import { auth } from "auth";
import { getUserRequestInfo } from "utils/userDDBClient";

export async function POST() {
  try {
    const authSession = await auth();

    if (!authSession || !authSession.user) {
      return NextResponse.json(
        { error: "You must be logged in to manage your subscription" },
        { status: 401 },
      );
    }

    // Get user from DynamoDB
    const user = await getUserRequestInfo(authSession.user.id!);

    if (!user) {
      console.log("User not found:", authSession.user.id);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.log("Creating billing portal session for user:", user);
    if (!user.stripeCustomerId) {
      console.log("No Stripe customer ID found for user:", user.userId);
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 },
      );
    }

    const headersList = await headers();
    const origin = headersList.get("origin");

    // Create Checkout Sessions from body params.
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/account`,
    });
    return NextResponse.redirect(session.url!, 303);
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode || 500 },
    );
  }
}
