import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(req: Request) {
  const { email } = await req.json();

  // Basic validation
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  try {
    // Request transfers capability so we can send funds to this connected account.
    // Express accounts require the seller to complete onboarding to enable capabilities.
    const account = await stripe.accounts.create({
      type: "express",
      country: "CH",
      email,
      // For US accounts, Stripe requires card_payments to be requested when
      // requesting transfers. Request both capabilities so onboarding can
      // be completed and transfers enabled.
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Create an Account Link so the seller can complete onboarding in Stripe.
    // Use localhost URLs for dev; you can replace with an env var if you prefer.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: baseUrl,
      // After onboarding we redirect to a dedicated onboarding-complete page
      // which will show a success message and link back to the app.
      return_url: `${baseUrl}/onboarding-complete`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      connected_account_id: account.id,
      account_link_url: accountLink.url,
    });
  } catch (err: any) {
    // Log the full error server-side to help debugging
    console.error("create-connected-account error:", err);
    return NextResponse.json(
      { error: err?.message ?? "unknown error" },
      { status: 400 }
    );
  }
}
