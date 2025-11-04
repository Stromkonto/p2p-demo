import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const accountId = url.searchParams.get("account_id");

  if (!accountId) {
    return NextResponse.json(
      { error: "account_id query param is required" },
      { status: 400 }
    );
  }

  try {
    // Retrieve the account to inspect capabilities and requirements.
    const account = await stripe.accounts.retrieve(accountId);

    // Only return a minimal safe subset to the client.
    const response = {
      id: account.id,
      capabilities: account.capabilities ?? {},
      requirements: account.requirements ?? {},
      payouts_enabled: (account as any).payouts_enabled ?? false,
    };

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("connected-account-status error:", err);
    return NextResponse.json(
      { error: err?.message ?? "unknown error" },
      { status: 400 }
    );
  }
}
