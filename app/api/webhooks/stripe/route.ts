import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  updateUserStripeInfo,
  updateUserTier,
  getUserByStripeCustomerId,
} from "utils/userDDBClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId && customerId && subscriptionId) {
          await updateUserStripeInfo(userId, customerId, subscriptionId, "paid");
          console.log(`User ${userId} upgraded to paid via checkout`);
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by stripe customer ID and update their tier
        const user = await getUserByStripeCustomerId(customerId);
        if (user) {
          await updateUserStripeInfo(
            user.userId,
            customerId,
            subscription.id,
            "paid"
          );
          console.log(`Subscription created for user ${user.userId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await getUserByStripeCustomerId(customerId);
        if (user) {
          // Check subscription status
          const isActive =
            subscription.status === "active" ||
            subscription.status === "trialing";
          await updateUserTier(user.userId, isActive ? "paid" : "free");
          console.log(
            `Subscription updated for user ${user.userId}: ${subscription.status}`
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await getUserByStripeCustomerId(customerId);
        if (user) {
          await updateUserTier(user.userId, "free");
          console.log(`Subscription canceled for user ${user.userId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const user = await getUserByStripeCustomerId(customerId);
        if (user) {
          // Optionally downgrade to free on payment failure
          // Or you might want to give them a grace period
          console.log(`Payment failed for user ${user.userId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
