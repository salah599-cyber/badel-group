import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { warnIfTestClerkKeysInProduction } from "@/lib/security";

const isPublicRoute = createRouteMatcher([
  "/",
  "/gallery(.*)",
  "/results(.*)",
  "/rankings(.*)",
  "/sponsors(.*)",
  "/signup(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pending-approval(.*)",
  "/api/webhooks(.*)",
  "/api/media(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/upload(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  warnIfTestClerkKeysInProduction();

  if (isPublicRoute(req)) return;

  if (isAdminRoute(req)) {
    // Auth only — role checks use currentUser() in layouts/API routes
    // because session JWT may not include publicMetadata until customized.
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
