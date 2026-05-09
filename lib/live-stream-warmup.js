import Hls from "hls.js";

import { LIVE_STREAM_FALLBACK_MAKKAH } from "@/lib/live-stream-defaults";

const SESSION_KEY = "qalb_live_makkah_warm_once";

let activeCleanup = null;

export function disposeLiveWarmup() {
  if (typeof activeCleanup !== "function") return;
  const fn = activeCleanup;
  activeCleanup = null;
  fn();
}

/**
 * Starts a muted off-screen HLS load for the default Makkah stream (TLS + manifest + cache).
 * No-op if already on /live, if a warmup is in progress, or if this tab already warmed (sessionStorage).
 */
export function warmMakkahLiveStream() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/live")) return;
  try {
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;
  } catch {
    /* private mode */
  }
  if (activeCleanup) return;

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.preload = "auto";
  video.setAttribute("aria-hidden", "true");
  video.tabIndex = -1;
  video.className =
    "fixed w-px h-px overflow-hidden opacity-0 pointer-events-none -z-[1] bottom-0 end-0 border-0 p-0 m-0";
  document.body.appendChild(video);

  const url = LIVE_STREAM_FALLBACK_MAKKAH;
  let hls = null;

  try {
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else {
      video.src = url;
    }
    void video.play().catch(() => {});
  } catch {
    video.remove();
    return;
  }

  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* ignore */
  }

  const stop = () => {
    try {
      if (hls) {
        hls.destroy();
        hls = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
    } catch {
      /* ignore */
    }
  };

  activeCleanup = stop;

  window.setTimeout(() => {
    disposeLiveWarmup();
  }, 45_000);
}
