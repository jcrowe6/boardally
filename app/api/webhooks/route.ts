// app/api/webhooks/route.ts
import { stripe } from '../../../lib/stripe';
import { NextResponse } from 'next/server';
import { Readable } from 'stream';
import Stripe from 'stripe';
import { getUserByStripeCustomerId, updateUserTier } from 'utils/userDDBClient';

// This is needed to disable Next.js body parsing
export const config = {
    api: {
        bodyParser: false,
    },
};

async function buffer(readable: ReadableStream) {
    const nodeStream = Readable.from(readable as unknown as AsyncIterable<Uint8Array>); // Explicitly type as AsyncIterable<Uint8Array>
    const chunks: Buffer[] = [];
    for await (const chunk of nodeStream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

export async function POST(req: Request) {
    try {
        const buf = await buffer(req.body!);
        const sig = req.headers.get('stripe-signature')!;

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(
                buf,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET!
            );
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return NextResponse.json({ error: err.message }, { status: 400 });
        }

        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutSessionCompleted(session);
                break;
            }
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdated(subscription);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionDeleted(subscription);
                break;
            }
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        );
    }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;

    if (!userId) {
        console.error('No userId in session metadata');
        return;
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
    );

    // Update user tier in DynamoDB
    updateUserTier(userId, session.customer as string, subscription.id, 'paid');
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    // Retrieve customer ID
    const customerId = subscription.customer as string;

    const user = await getUserByStripeCustomerId(customerId)

    if (!user) {
        console.error(`No user found with Stripe customer ID: ${customerId}`);
        return;
    }

    // Check subscription status
    const status = subscription.status;
    const tier = status === 'active' || status === 'trialing' ? 'paid' : 'free';

    // Update user tier
    updateUserTier(user.id, customerId, subscription.id, tier);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    // Similar to handleSubscriptionUpdated but always set tier to 'free'
    const customerId = subscription.customer as string;

    const user = await getUserByStripeCustomerId(customerId)

    if (!user) {
        return;
    }

    // Update user tier
    updateUserTier(user.id, customerId, subscription.id, 'free');
}