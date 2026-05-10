"use client";

import { useEffect } from "react";

import { toLocalDayKey } from "@/lib/local-calendar-day";
import { LS_APP_ACTIVE_DAY } from "@/lib/qalb-storage-keys";

/** Marks “today” in localStorage so the profile heatmap can lightly highlight the current day. */
export default function AppDayStamp() {
  useEffect(() => {
    try {
      localStorage.setItem(LS_APP_ACTIVE_DAY, toLocalDayKey());
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
