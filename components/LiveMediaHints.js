"use client";

import { useEffect } from "react";

import { ensureLiveDualPrewarm } from "@/lib/live-dual-prewarm";
import { LIVE_STREAM_ORIGINS } from "@/lib/live-stream-defaults";

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
    // Every candidate origin — a failover to the backup host should not pay for
    // a cold DNS + TLS handshake on top of the failed manifest request.
    for (const origin of LIVE_STREAM_ORIGINS) {
      injectOnce("dns-prefetch", origin, false);
      injectOnce("preconnect", origin, true);
    }
  }, []);

  useEffect(() => {
    const run = () => {
      void ensureLiveDualPrewarm().catch(() => {});
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
