import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { authOptions } from "@/lib/auth";
import { apiLog } from "@/lib/logger";
import { UserRepository } from "@/lib/user-api";

export const GET = withLoggedRoute(async () => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    return NextResponse.json({ streak: 0, authenticated: false });
  }

  try {
    const data = await UserRepository.getStreak(token);
    return NextResponse.json({ ...(data ?? { streak: 0 }), authenticated: true });
  } catch (error) {
    apiLog.error("user_streak_failed", { err: error });
    return NextResponse.json({ streak: 0, authenticated: true, error: "Failed to fetch streak" });
  }
});
