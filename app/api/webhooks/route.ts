// app/api/webhooks/route.ts
import { stripe } from "../../../lib/stripe";
import { NextResponse } from "next/server";
import { Readable } from "stream";
import Stripe from "stripe";
import { getUserByStripeCustomerId, updateUserTier } from "utils/userDDBClient";

// This is needed to disable Next.js body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: ReadableStream) {
  const nodeStream = Readable.from(
    readable as unknown as AsyncIterable<Uint8Array>,
  ); // Explicitly type as AsyncIterable<Uint8Array>
  const chunks: Buffer[] = [];
  for await (const chunk of nodeStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: Request) {
  try {
    const buf = await buffer(req.body!);
    const sig = req.headers.get("stripe-signature")!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        buf,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.log(`Received event: ${event.type}`);
    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  console.log(`Handling checkout session completion for session ${session.id}`);
  const userId = session.metadata?.userId;

  if (!userId) {
    console.error("No userId in session metadata");
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string,
  );

  // Update user tier in DynamoDB
  await updateUserTier(
    userId,
    session.customer as string,
    subscription.id,
    "paid",
  );
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Retrieve customer ID
  const customerId = subscription.customer as string;
  console.log(
    `Handling subscription update for customer ${customerId}, subscription ${subscription.id}`,
  );

  const user = await getUserByStripeCustomerId(customerId);

  if (!user) {
    console.error(`No user found with Stripe customer ID: ${customerId}`);
    return;
  }

  // Check subscription status
  const status = subscription.status;
  const tier = status === "active" || status === "trialing" ? "paid" : "free";
  console.log(
    `Subscription status for customer ${customerId}: ${status}. Setting tier to ${tier}`,
  );

  // Update user tier
  await updateUserTier(user.userId, customerId, subscription.id, tier);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Similar to handleSubscriptionUpdated but always set tier to 'free'
  const customerId = subscription.customer as string;
  console.log(
    `Handling subscription deletion for customer ${customerId}, subscription ${subscription.id}`,
  );

  const user = await getUserByStripeCustomerId(customerId);

  if (!user) {
    console.error(`No user found with Stripe customer ID: ${customerId}`);
    return;
  }

  // Update user tier
  await updateUserTier(user.userId, customerId, subscription.id, "free");
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  console.log(
    `Handling payment failure for customer ${customerId}, invoice ${invoice.id}`,
  );

  const user = await getUserByStripeCustomerId(customerId);

  if (!user) {
    console.error(`No user found with Stripe customer ID: ${customerId}`);
    return;
  }

  if (!user.stripeSubscriptionId) {
    console.error(`No subscription found in our records`);
    return;
  }

  // Optionally, you might want to notify the user or log more details here.
  console.warn(
    `Payment failed for user ${user.userId} (customer ${customerId}), invoice ${invoice.id}`,
  );

  // Set user tier to 'free' due to payment failure
  await updateUserTier(
    user.userId,
    customerId,
    user.stripeSubscriptionId,
    "free",
  );
}
