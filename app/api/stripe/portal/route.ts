import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "auth";
import { getUserRequestInfo } from "utils/userDDBClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userInfo = await getUserRequestInfo(session.user.id);

    if (!userInfo.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found" },
        { status: 400 }
      );
    }

    // Create billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userInfo.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/account`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
