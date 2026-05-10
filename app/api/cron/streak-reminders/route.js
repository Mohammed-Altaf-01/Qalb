import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { apiLog } from "@/lib/logger";

/**
 * Vercel cron / infra — protect with Bearer secret until Web Push payloads are wired.
 */
export const GET = withLoggedRoute(async (request) => {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("Authorization");
  const ok = secret && auth === `Bearer ${secret}`;
  if (!ok) {
    apiLog.warn("cron_streak_reminders_unauthorized", {});
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /** Placeholder fan-out hook — avoids shipping unsigned pushes by default. */
  return NextResponse.json({ ok: true, delivered: 0, note: "Push fan-out scaffold — wire Web Push payloads next." });
});
