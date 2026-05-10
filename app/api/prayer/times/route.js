import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { apiLog } from "@/lib/logger";

const ALLOW_HOST = "api.aladhan.com";

/** @returns {string} DD-MM-YYYY */
function formatAladhanDate(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

export const GET = withLoggedRoute(async (request) => {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("latitude") ?? searchParams.get("lat") ?? "21.3891");
  const lon = parseFloat(searchParams.get("longitude") ?? searchParams.get("lon") ?? "39.8579");
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }
  const method = parseInt(searchParams.get("method") ?? "4", 10);
  const safeMethod = Number.isFinite(method) && method >= 0 && method <= 24 ? method : 4;

  try {
    const day = formatAladhanDate(new Date());
    const upstream = `https://${ALLOW_HOST}/v1/timings/${encodeURIComponent(day)}?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&method=${safeMethod}`;
    const res = await fetch(upstream, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) {
      apiLog.warn("prayer_times_upstream", { status: res.status });
      return NextResponse.json({ error: "Prayer lookup failed" }, { status: 502 });
    }
    const payload = await res.json();
    return NextResponse.json({
      timings: payload?.data?.timings ?? null,
      date: payload?.data?.date,
      meta: payload?.data?.meta,
      method: safeMethod,
    });
  } catch (e) {
    apiLog.error("prayer_times_failed", { err: e });
    return NextResponse.json({ error: "Prayer lookup failed" }, { status: 502 });
  }
});
