import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { authOptions } from "@/lib/auth";
import { apiLog } from "@/lib/logger";
import { signMobileSessionToken } from "@/lib/mobile-jwt";

/**
 * Mobile OAuth handoff: open this URL in an in-app browser after the user
 * signs in with NextAuth. Redirects to `qalb://mobile-auth?token=…`.
 */
export const GET = withLoggedRoute(async (request) => {
  const session = await getServerSession(authOptions);
  const here = new URL(request.url);

  if (!session?.user?.id) {
    const login = new URL("/auth/signin", here.origin);
    login.searchParams.set("callbackUrl", here.toString());
    return NextResponse.redirect(login);
  }

  let token;
  try {
    token = await signMobileSessionToken(session.user.id);
  } catch (e) {
    apiLog.error("mobile_auth_jwt_failed", { err: e });
    return NextResponse.json({ error: "Mobile session signing is not configured" }, { status: 503 });
  }

  const deep = `qalb://mobile-auth?token=${encodeURIComponent(token)}`;
  return NextResponse.redirect(deep);
});
