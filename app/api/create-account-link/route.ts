import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(req: Request) {
  try {
    const { account_id } = await req.json();

    if (!account_id || typeof account_id !== "string") {
      return NextResponse.json(
        { error: "account_id is required" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const accountLink = await stripe.accountLinks.create({
      account: account_id,
      refresh_url: baseUrl,
      // Same onboarding-complete return URL as account creation
      return_url: `${baseUrl}/onboarding-complete`,
      type: "account_onboarding",
    });

    return NextResponse.json({ account_link_url: accountLink.url });
  } catch (err: any) {
    console.error("create-account-link error:", err);
    return NextResponse.json(
      { error: err?.message ?? "unknown error" },
      { status: 400 }
    );
  }
}
