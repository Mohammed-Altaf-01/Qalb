/**
 * @fileoverview SplashScreen Component — Bismillah Intro Animation
 *
 * Displays a full-screen bismillah calligraphy animation on the user's
 * first visit per session. After ~2.4 s the screen slides upward,
 * revealing the app beneath.
 *
 * Implementation notes:
 *  - sessionStorage flag ensures it plays only once per browser tab session
 *  - Pure CSS keyframes — no animation library needed
 *  - `pointer-events: none` after exit so it never blocks interaction
 *  - Rendered inside a portal via a fixed-position div so it sits above
 *    everything else without affecting document flow
 */

"use client";

import { useEffect, useState } from "react";

/**
 * Inline style blocks for the animation phases.
 * Defined outside the component to avoid re-creation on every render.
 */
const KEYFRAME_CSS = `
  @keyframes bismillah-fade-in {
    0%   { opacity: 0; transform: scale(0.92) translateY(8px); }
    100% { opacity: 1; transform: scale(1)    translateY(0);   }
  }
  @keyframes gold-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes line-expand {
    0%   { width: 0;    opacity: 0; }
    60%  { opacity: 1;              }
    100% { width: 120px; opacity: 0.6; }
  }
  @keyframes splash-exit {
    0%   { transform: translateY(0);     opacity: 1; }
    100% { transform: translateY(-100%); opacity: 0; }
  }
  @keyframes dot-pulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%            { transform: scale(1);   opacity: 1;   }
  }
`;

export default function SplashScreen() {
  // "visible" → "exiting" → "gone"
  const [phase, setPhase] = useState("visible");

  useEffect(() => {
    // Only show once per browser session
    if (sessionStorage.getItem("qalb_splash_shown")) {
      setPhase("gone");
      return;
    }
    sessionStorage.setItem("qalb_splash_shown", "1");

    // Hold for 2.2 s, then start the exit slide
    const exitTimer = setTimeout(() => setPhase("exiting"), 2200);
    // After exit animation (500 ms), unmount entirely
    const goneTimer = setTimeout(() => setPhase("gone"), 2700);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(goneTimer);
    };
  }, []);

  // Fully unmounted — render nothing
  if (phase === "gone") return null;

  return (
    <>
      {/* Inject keyframes once */}
      <style>{KEYFRAME_CSS}</style>

      {/* ── Overlay ─────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "oklch(0.09 0.022 155)",
          animation: phase === "exiting" ? "splash-exit 0.5s cubic-bezier(0.76, 0, 0.24, 1) forwards" : "none",
          pointerEvents: phase === "exiting" ? "none" : "all",
        }}
      >
        {/* ── Radial glow behind the text ────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            width: "340px",
            height: "340px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(200,169,81,0.12) 0%, transparent 70%)",
            animation: "bismillah-fade-in 1s ease-out 0.2s both",
          }}
        />

        {/* ── Bismillah Arabic text ──────────────────────────────────── */}
        <p
          style={{
            fontFamily: "'Amiri', 'Traditional Arabic', serif",
            fontSize: "clamp(2rem, 8vw, 3.5rem)",
            lineHeight: 1.6,
            direction: "rtl",
            letterSpacing: "0.04em",
            margin: 0,
            padding: "0 1rem",
            textAlign: "center",
            /* Animated gold shimmer gradient */
            background: "linear-gradient(120deg, #8a6b2a 0%, #c8a951 30%, #f0d898 50%, #c8a951 70%, #8a6b2a 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation:
              "bismillah-fade-in 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both, " +
              "gold-shimmer 2.5s linear 0.8s infinite",
          }}
        >
          بسم الله الرحمن الرحيم
        </p>

        {/* ── Expanding gold line beneath ────────────────────────────── */}
        <div
          style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, #c8a951, transparent)",
            animation: "line-expand 1.2s ease-out 0.9s both",
            marginTop: "1.25rem",
          }}
        />

        {/* ── App name ───────────────────────────────────────────────── */}
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.75rem",
            fontWeight: 500,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(200,169,81,0.65)",
            marginTop: "1rem",
            animation: "bismillah-fade-in 0.8s ease-out 1.3s both",
          }}
        >
          Qalb
        </p>

        {/* ── Three pulsing dots (loading indicator) ─────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            marginTop: "2.5rem",
            animation: "bismillah-fade-in 0.6s ease-out 1.5s both",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "rgba(200,169,81,0.7)",
                display: "inline-block",
                animation: `dot-pulse 1.2s ease-in-out ${i * 0.16}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
