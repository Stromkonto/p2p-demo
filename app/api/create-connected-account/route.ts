import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(req: Request) {
  const {
    email,
    address,
    dob,
    first_name,
    last_name,
    phone,
    external_account,
  } = await req.json();

  // Basic validation
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  try {
    // Request transfers capability so we can send funds to this connected account.
    // Express accounts require the seller to complete onboarding to enable capabilities.
    const account = await stripe.accounts.create({
      type: "custom",
      country: "CH",
      email,
      business_type: "individual",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
        twint_payments: { requested: true },
      },
      business_profile: {
        mcc: "1520", // General Services
        url: "https://www.stromkonto.ch",
      },
      individual: {
        first_name: first_name,
        last_name: last_name,
        phone: phone,
        email: email,
        address: {
          line1: address?.line1,
          city: address?.city,
          state: address?.state,
          postal_code: address?.postal_code,
          country: address?.country,
        },
        dob: {
          day: dob?.day,
          month: dob?.month,
          year: dob?.year,
        },
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: "12.79.78.46",
      },
    });

    // Attach a test external bank account to the connected account for payouts
    const bankAccount = await stripe.accounts.createExternalAccount(
      account.id,
      {
        external_account: {
          object: "bank_account",
          country: "CH",
          currency: "chf",
          account_number: external_account?.account_number,
          account_holder_name: external_account?.account_holder_name,
          account_holder_type: external_account?.account_holder_type,
        },
      }
    );

    // Include the external bank account in the response
    return NextResponse.json({
      connected_account_id: account.id,
      external_bank_account: bankAccount.id,
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
