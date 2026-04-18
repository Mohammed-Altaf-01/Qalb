/**
 * @fileoverview BismillahHeader — Client Component
 *
 * Renders the opening Basmala with two layered animations:
 *
 *  1. Load animation — text materializes from near-invisible + blurred into
 *     crisp full-gold over 3 seconds. English translation fades in below with
 *     a slight delay, giving a reveal-in-stages feel.
 *
 *  2. Hover energy — a gold drop-shadow glow envelops the text while two
 *     concentric rings expand outward and fade. Rings remount on every
 *     mouse-enter so the animation replays each time.
 *
 * Client Component because:
 *  - Hover state drives the glow filter and ring visibility
 *  - `ringKey` is incremented on each hover to force ring remount & replay
 */

"use client";

import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ dateIso?: string }} props
 */
export default function BismillahHeader({ dateIso }) {
  const [hovered, setHovered] = useState(false);
  /** Increment on each mouse-enter to force ring elements to remount. */
  const [ringKey, setRingKey] = useState(0);

  const date = dateIso ? new Date(dateIso) : new Date();
  const formatted = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function handleEnter() {
    setHovered(true);
    setRingKey((k) => k + 1);
  }

  // Gold drop-shadow filter applied to the wrapper on hover.
  // Using wrapper (not the h1) avoids conflict with the h1's load blur animation.
  const glowFilter = hovered
    ? "drop-shadow(0 0 8px rgba(200,169,81,0.85)) drop-shadow(0 0 24px rgba(200,169,81,0.40)) drop-shadow(0 0 52px rgba(200,169,81,0.18))"
    : "drop-shadow(0 0 0px transparent)";

  return (
    <div className="text-center mb-8 select-none">
      {/* ── Bismillah wrapper — owns the hover glow filter ─────────────── */}
      <div
        className="relative inline-block cursor-default"
        onMouseEnter={handleEnter}
        onMouseLeave={() => setHovered(false)}
        style={{ filter: glowFilter, transition: "filter 0.55s ease" }}
      >
        {/* Radial background glow — fades in on hover */}
        <div
          aria-hidden="true"
          className="absolute pointer-events-none rounded-[50%] transition-opacity duration-700"
          style={{
            inset: "-32px -56px",
            background: "radial-gradient(ellipse at center, oklch(0.72 0.13 75 / 0.16) 0%, transparent 68%)",
            opacity: hovered ? 1 : 0,
          }}
        />

        {/* Energy rings — remounted each hover so animation replays */}
        {hovered && (
          <div key={ringKey} aria-hidden="true" className="absolute inset-0 pointer-events-none">
            <div
              className="absolute rounded-[50%] border border-accent/45 bismillah-ring-1"
              style={{ inset: "-18px -36px" }}
            />
            <div
              className="absolute rounded-[50%] border border-accent/25 bismillah-ring-2"
              style={{ inset: "-18px -36px" }}
            />
          </div>
        )}

        {/* Arabic Bismillah — materializes on load */}
        <h1 className="arabic-text text-gradient-gold text-2xl md:text-3xl font-bold bismillah-animate relative z-10">
          بسم الله الرحمن الرحيم
        </h1>
      </div>

      {/* English translation — fades in after the Arabic */}
      <p className="text-[11px] text-muted-foreground/60 mt-2.5 tracking-widest uppercase bismillah-translation-animate">
        In the name of Allah, the Most Gracious, the Most Merciful
      </p>

      {/* Date */}
      <p className="text-xs text-muted-foreground/50 mt-1.5 tracking-wide bismillah-date-animate">{formatted}</p>
    </div>
  );
}
