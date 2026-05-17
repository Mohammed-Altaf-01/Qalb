"use client";

import { useEffect, useRef } from "react";

import {
  MIN_LISTEN_POSITION_SEC,
  loadListenHistoryPayload,
  saveListenHistoryPayload,
  upsertListenEntry,
} from "@/lib/listen-history";
import { getQuranAudioState, subscribeQuranAudio } from "@/lib/quran-audio-player";
import { schedulePushListenHistory } from "@/lib/user-app-sync-bridge";

const THROTTLE_MS = 5000;

/**
 * Persist current listen playback position from global player state.
 * @param {ReturnType<typeof getQuranAudioState> | null} [player]
 */
export function flushListenHistoryFromPlayer(player = null) {
  const p = player ?? getQuranAudioState();
  if (p.mode !== "listen" || p.reciterId == null || p.surahId == null) return;

  const positionSec = Number(p.currentTime) || 0;
  if (positionSec < MIN_LISTEN_POSITION_SEC) return;

  const surahName = p.label?.split(" · ")[0]?.trim() || `Surah ${p.surahId}`;
  const { entries } = loadListenHistoryPayload();
  const updated = upsertListenEntry(entries, {
    reciterId: p.reciterId,
    reciterName: p.reciterName || "",
    surahId: p.surahId,
    surahName,
    positionSec,
    durationSec: Number(p.duration) || 0,
    updatedAt: Date.now(),
  });
  saveListenHistoryPayload({ entries: updated, updatedAt: Date.now() });
  schedulePushListenHistory();
}

/** Tracks listen mode progress globally (works off /listen when mini-player is active). */
export function useListenHistoryTracker() {
  const lastFlushAtRef = useRef(0);
  const lastSnapshotRef = useRef(null);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushListenHistoryFromPlayer(lastSnapshotRef.current ?? undefined);
      }
    };
    const onPageHide = () => flushListenHistoryFromPlayer(lastSnapshotRef.current ?? undefined);

    const unsub = subscribeQuranAudio((p) => {
      if (
        p.mode === "listen" &&
        p.reciterId != null &&
        p.surahId != null &&
        (p.status === "playing" || p.status === "paused" || p.status === "loading")
      ) {
        lastSnapshotRef.current = p;
        const now = Date.now();
        const force = p.status === "paused";
        if (!force && now - lastFlushAtRef.current < THROTTLE_MS) return;
        lastFlushAtRef.current = now;
        flushListenHistoryFromPlayer(p);
        return;
      }

      if (p.mode === "idle" && lastSnapshotRef.current) {
        flushListenHistoryFromPlayer(lastSnapshotRef.current);
        lastSnapshotRef.current = null;
      }
    });

    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      unsub();
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      if (lastSnapshotRef.current) {
        flushListenHistoryFromPlayer(lastSnapshotRef.current);
      }
    };
  }, []);
}
