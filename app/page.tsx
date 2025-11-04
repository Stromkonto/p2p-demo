"use client";

import { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function Home() {
  const [sellerAccountId, setSellerAccountId] = useState("");
  const [email, setEmail] = useState("");
  const [accountLinkUrl, setAccountLinkUrl] = useState("");
  const [sellerInput, setSellerInput] = useState("");
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [transfersActive, setTransfersActive] = useState(false);
  const pollingRef = useRef<number | null>(null);
  // receiverInput: the account (receiver) who will get the payment (e.g. "john")
  const [receiverInput, setReceiverInput] = useState("");
  const [kwh, setKwh] = useState(1000);
  const PRICE_PER_KWH = 0.2; // $0.20 per kWh
  // amount in cents calculated from kWh
  const amount = Math.round(kwh * PRICE_PER_KWH * 100);
  const [clientSecret, setClientSecret] = useState("");

  // Hydrate sellerAccountId from localStorage if present (so it survives the
  // redirect to Stripe onboarding and back).
  useEffect(() => {
    try {
      const saved = localStorage.getItem("connected_account_id");
      if (saved) {
        setSellerAccountId(saved);
        setSellerInput(saved);
      }
    } catch (err) {
      // ignore
    }
  }, []);

  async function createSeller() {
    const res = await fetch("/api/create-connected-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setSellerAccountId(data.connected_account_id);
    // Prefill seller input and persist so it survives redirect through Stripe
    if (data.connected_account_id) {
      setSellerInput(data.connected_account_id);
      try {
        localStorage.setItem("connected_account_id", data.connected_account_id);
      } catch (err) {
        // ignore
      }
    }
    if (data.account_link_url) {
      setAccountLinkUrl(data.account_link_url);
      // Redirect the current tab to the Stripe onboarding / verification link
      // so the seller can upload required verification documents before
      // returning to the app to create a payment intent.
      window.location.href = data.account_link_url;
    }
  }

  async function createPaymentIntent() {
    const res = await fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, seller_account_id: sellerAccountId }),
    });
    const data = await res.json();
    setClientSecret(data.client_secret);
  }

  async function createAccountLink() {
    if (!sellerAccountId) return;
    try {
      const res = await fetch("/api/create-account-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: sellerAccountId }),
      });
      const data = await res.json();
      if (data.account_link_url) {
        // redirect current tab to the verification link
        window.location.href = data.account_link_url;
      } else if (data.error) {
        alert(`Could not create account link: ${data.error}`);
      }
    } catch (err) {
      console.error("createAccountLink error", err);
      alert("Failed to create account link");
    }
  }

  // Poll the connected account status so we can show verification requirements
  // and only enable payments once transfers are enabled.
  useEffect(() => {
    if (!sellerAccountId) return;

    let stopped = false;

    async function fetchStatus() {
      try {
        const res = await fetch(
          `/api/connected-account-status?account_id=${sellerAccountId}`
        );
        const json = await res.json();
        setAccountStatus(json);

        const caps = json.capabilities || {};
        const transfers = caps.transfers;
        const isActive = transfers === "active";
        setTransfersActive(isActive);

        // stop polling when transfers become active
        if (isActive && !stopped) {
          if (pollingRef.current) window.clearInterval(pollingRef.current);
          stopped = true;
        }
      } catch (err) {
        console.error("error fetching account status", err);
      }
    }

    // initial fetch and then poll every 3s
    fetchStatus();
    pollingRef.current = window.setInterval(fetchStatus, 3000);

    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
  }, [sellerAccountId]);

  return (
    <main className="flex flex-col items-center gap-6 p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">☀️ P2P Energy Trade Demo</h1>

      <div className="border p-4 rounded w-full">
        <h2 className="font-semibold mb-2">1️⃣ Create Seller Account</h2>
        <input
          type="email"
          placeholder="seller@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border px-2 py-1 rounded w-full mb-2"
        />
        <button
          onClick={createSeller}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          Create Connected Account
        </button>
        {sellerAccountId && (
          <>
            <p className="text-green-600 mt-2">
              ✅ Seller ID: {sellerAccountId}
            </p>
            <label className="text-sm mt-2">
              Your seller account id or email
            </label>
            <input
              type="text"
              placeholder="acct_... or seller@example.com"
              value={sellerInput}
              onChange={(e) => setSellerInput(e.target.value)}
              className="border px-2 py-1 rounded w-full mb-2"
            />
            {accountLinkUrl && (
              <p className="mt-2 text-sm">
                Seller onboarding started —{" "}
                <a
                  href={accountLinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  complete onboarding
                </a>
              </p>
            )}
          </>
        )}
      </div>

      <div className="border p-4 rounded w-full">
        <h2 className="font-semibold mb-2">2️⃣ Buyer Payment</h2>
        <p>
          Sell {kwh.toLocaleString()} kWh @ ${PRICE_PER_KWH.toFixed(2)}/kWh = $
          {(amount / 100).toFixed(2)}
        </p>
        <label className="text-sm mt-2">Receiver account id or email</label>
        <input
          type="text"
          placeholder="acct_... or receiver@example.com"
          value={receiverInput || sellerAccountId}
          onChange={(e) => setReceiverInput(e.target.value)}
          className="border px-2 py-1 rounded w-full mb-2"
        />
        <label className="text-sm">Amount (kWh)</label>
        <input
          type="number"
          value={kwh}
          onChange={(e) => setKwh(Number(e.target.value))}
          className="border px-2 py-1 rounded w-full mb-2"
        />
        <div className="flex flex-col gap-2">
          <button
            disabled={!(receiverInput || sellerAccountId)}
            onClick={async () => {
              // determine whether receiver input is account id or email
              const receiver = receiverInput || sellerAccountId;
              const isReceiverAcct = receiver?.startsWith("acct_");
              // determine seller (your account) from the sellerInput or sellerAccountId
              const seller = sellerInput || sellerAccountId;
              const isSellerAcct = seller?.startsWith("acct_");

              const body: any = { amount };
              if (isReceiverAcct) body.receiver_account_id = receiver;
              else body.receiver_email = receiver;

              if (seller) {
                if (isSellerAcct) body.seller_account_id = seller;
                else body.seller_email = seller;
              }

              const res = await fetch("/api/create-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });
              const data = await res.json();
              if (data.error) {
                alert(`PaymentIntent error: ${data.error}`);
              } else {
                setClientSecret(data.client_secret);
              }
            }}
            className="bg-green-600 text-white px-4 py-2 rounded w-full disabled:opacity-50"
          >
            Create PaymentIntent
          </button>

          {/* Show account verification status */}
          {sellerAccountId && accountStatus && (
            <div className="mt-2 text-sm text-gray-700">
              <p>
                Account status: <strong>{accountStatus.id}</strong>
              </p>
              <p>
                Transfers capability:{" "}
                <strong>
                  {accountStatus.capabilities?.transfers ?? "unknown"}
                </strong>
              </p>
              {accountStatus.requirements && (
                <div className="mt-2">
                  <p className="font-semibold">Verification requirements</p>
                  {Array.isArray(accountStatus.requirements.currently_due) &&
                  accountStatus.requirements.currently_due.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {accountStatus.requirements.currently_due.map(
                        (r: string) => (
                          <li key={r}>{r}</li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-green-600">
                      No currently due requirements.
                    </p>
                  )}
                </div>
              )}
              {/* Show a button to re-open onboarding/verification when transfers are not active */}
              {!transfersActive && (
                <div className="mt-3">
                  <button
                    onClick={createAccountLink}
                    className="bg-yellow-600 text-white px-3 py-2 rounded"
                  >
                    Complete identity verification
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm />
        </Elements>
      )}
    </main>
  );
}

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: any) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: "http://localhost:3000/confirm" },
    });

    if ((result as any).error) alert((result as any).error.message);
    else console.log("PaymentIntent:", (result as any).paymentIntent);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full border p-4 rounded">
      <PaymentElement />
      <button
        type="submit"
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded w-full mt-4"
      >
        {loading ? "Processing..." : "Pay $200"}
      </button>
    </form>
  );
}
