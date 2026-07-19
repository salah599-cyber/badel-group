import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAccessFromClaims } from "@/lib/access";

const isPublicRoute = createRouteMatcher([
  "/",
  "/gallery(.*)",
  "/results(.*)",
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
  if (isPublicRoute(req)) return;

  if (isAdminRoute(req)) {
    await auth.protect();
    const { isAdmin } = getAccessFromClaims((await auth()).sessionClaims);
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/?error=unauthorized", req.url));
    }
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
