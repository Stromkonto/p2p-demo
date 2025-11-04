export default function OnboardingComplete() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        🎉 Onboarding complete
      </h1>
      <p className="mb-4">
        Thank you — your identity verification was received.
      </p>
      <p className="mb-6">
        You can now return to the app to create payments and receive transfers.
      </p>
      <a href="/" className="bg-blue-600 text-white px-4 py-2 rounded">
        Back to Home
      </a>
    </main>
  );
}
