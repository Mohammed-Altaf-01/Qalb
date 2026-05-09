"use client";

import { useEffect } from "react";

import { LIVE_STREAM_CDN_ORIGIN } from "@/lib/live-stream-defaults";

function injectOnce(rel, href, crossOrigin) {
  if (typeof document === "undefined") return;
  const sel = `link[rel="${rel}"][href="${href}"]`;
  if (document.head.querySelector(sel)) return;
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (crossOrigin) link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

/**
 * DNS + TLS warmup for live TV CDN (runs once per document).
 */
export default function LiveMediaHints() {
  useEffect(() => {
    injectOnce("dns-prefetch", LIVE_STREAM_CDN_ORIGIN, false);
    injectOnce("preconnect", LIVE_STREAM_CDN_ORIGIN, true);
  }, []);

  useEffect(() => {
    const run = () => {
      void fetch("/api/live/tv?language=eng").catch(() => {});
    };
    const ric = window.requestIdleCallback;
    if (typeof ric === "function") {
      const id = ric(run, { timeout: 20_000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(run, 12_000);
    return () => clearTimeout(t);
  }, []);

  return null;
}
