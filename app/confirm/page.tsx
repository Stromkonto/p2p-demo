export default function ConfirmPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        ✅ Payment Successful!
      </h1>
      <p>Your 1,000 kWh has been purchased successfully.</p>
      <a href="/" className="text-blue-500 mt-6 underline">
        Back to Home
      </a>
    </main>
  );
}
