"use client";

import { useEffect, useRef } from "react";

import { useSession } from "next-auth/react";

import { LS_LAST_SESSION_ACTIVITY_DAY } from "@/lib/qalb-storage-keys";

/**
 * Once per calendar day while signed in, records a lightweight activity event
 * so the profile heatmap can show "today" even before other actions.
 */
export default function SessionActivityPing() {
  const { status } = useSession();
  const sentRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (sentRef.current) return;
    sentRef.current = true;

    const today = new Date().toISOString().split("T")[0];
    try {
      const last = localStorage.getItem(LS_LAST_SESSION_ACTIVITY_DAY);
      if (last === today) return;
      localStorage.setItem(LS_LAST_SESSION_ACTIVITY_DAY, today);
    } catch {
      /* ignore */
    }

    void fetch("/api/user/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "app_session_touch",
        metadata: { day: today },
      }),
    }).catch(() => {});
  }, [status]);

  return null;
}
