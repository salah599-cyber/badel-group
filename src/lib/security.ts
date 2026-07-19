let clerkKeyWarningLogged = false;

export function warnIfTestClerkKeysInProduction() {
  if (clerkKeyWarningLogged || process.env.NODE_ENV !== "production") return;

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const secretKey = process.env.CLERK_SECRET_KEY ?? "";

  if (publishableKey.startsWith("pk_test_") || secretKey.startsWith("sk_test_")) {
    clerkKeyWarningLogged = true;
    console.error(
      "[security] Production is using Clerk TEST keys. Set pk_live_ and sk_live_ keys in Vercel.",
    );
  }
}
