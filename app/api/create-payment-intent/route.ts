import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

const PLATFORM_FEE_PERCENT = 0.01;

export async function POST(req: Request) {
  const {
    amount,
    // new receiver fields preferred
    receiver_account_id,
    receiver_email,
    // legacy seller fields (kept for backward compatibility)
    seller_account_id,
    seller_email,
  } = await req.json();

  // Basic validation
  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }

  // Determine destination account. Prefer receiver_* fields, fallback to legacy seller_* fields
  let destinationAccount = receiver_account_id || seller_account_id;
  let lookupEmail = receiver_email || seller_email;

  if (!destinationAccount) {
    if (lookupEmail && typeof lookupEmail === "string") {
      // Attempt to find the connected account by email
      try {
        // The Stripe Typescript typings don't expose an 'email' filter on
        // accounts.list, so list a batch and find by email client-side.
        const list = await stripe.accounts.list({ limit: 100 } as any);
        const found = list.data.find((a) => a.email === lookupEmail);
        if (found) {
          destinationAccount = found.id;
        } else {
          return NextResponse.json(
            { error: "no connected account found for that email" },
            { status: 400 }
          );
        }
      } catch (err: any) {
        console.error("error looking up account by email", err);
        return NextResponse.json(
          { error: "failed to lookup account" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error:
            "receiver_account_id or receiver_email (or seller_account_id/seller_email) is required",
        },
        { status: 400 }
      );
    }
  }

  try {
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      application_fee_amount: platformFee,
      transfer_data: { destination: destinationAccount },
      description: `Purchase`,
    });

    return NextResponse.json({ client_secret: paymentIntent.client_secret });
  } catch (err: any) {
    console.error("create-payment-intent error:", err);
    return NextResponse.json(
      { error: err?.message ?? "unknown error" },
      { status: 400 }
    );
  }
}
