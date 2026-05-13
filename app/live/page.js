import { getInternalAppOrigin, shouldDeferLoopbackSelfFetchDuringBuild } from "@/lib/internal-app-url";
import { LIVE_STREAM_FALLBACK_MADINAH, LIVE_STREAM_FALLBACK_MAKKAH } from "@/lib/live-stream-defaults";

import LiveClient from "./LiveClient";

export const metadata = {
  title: "Live — Qalb",
  description: "Watch Makkah and Madinah live streams directly inside Qalb.",
};

export default async function LivePage() {
  let channels = [];
  try {
    const baseUrl = await getInternalAppOrigin();
    if (shouldDeferLoopbackSelfFetchDuringBuild(baseUrl)) {
      throw new Error("defer_live_tv_build");
    }
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/live/tv?language=eng`, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) {
      const data = await res.json();
      channels = Array.isArray(data?.channels) ? data.channels : [];
    }
  } catch {}

  if (channels.length === 0) {
    channels = [
      { id: 3, name: "Quran channel (Makkah)", url: LIVE_STREAM_FALLBACK_MAKKAH },
      { id: 4, name: "Sunna channel (Madinah)", url: LIVE_STREAM_FALLBACK_MADINAH },
    ];
  }

  return <LiveClient channels={channels} />;
}
