/**
 * @fileoverview SplashScreen Component — Bismillah Intro Animation
 *
 * Displays a full-screen bismillah calligraphy animation on the user's
 * first visit per session. After the hold the screen slides upward,
 * revealing the app beneath.
 *
 * Implementation notes:
 *  - sessionStorage flag ensures it plays only once per browser tab session
 *  - Pure CSS keyframes — no animation library needed
 *  - Any pointerdown/keydown skips straight to the exit; the splash never
 *    holds the app hostage
 *  - `pointer-events: none` after exit so it never blocks interaction
 *  - Rendered inside a portal via a fixed-position div so it sits above
 *    everything else without affecting document flow
 */

"use client";

import { useEffect, useState } from "react";

/**
 * How long the splash holds before exiting.
 *
 * This is not a first-run moment — the flag lives in `sessionStorage`, so a
 * returning user pays it again in every new tab. That puts it well outside the
 * "rare, can add delight" tier, so the hold is kept short and the whole screen
 * is dismissible on tap or keypress rather than blocking input outright.
 */
export const SPLASH_HOLD_MS = 1400;

/** Exit animation length; the component unmounts once it finishes. */
export const SPLASH_EXIT_MS = 420;

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
  /* scaleX, not width: width forces layout on every frame of the reveal. */
  @keyframes line-expand {
    0%   { transform: scaleX(0); opacity: 0;   }
    60%  {                       opacity: 1;   }
    100% { transform: scaleX(1); opacity: 0.6; }
  }
  @keyframes splash-exit {
    0%   { transform: translateY(0);     opacity: 1; }
    100% { transform: translateY(-100%); opacity: 0; }
  }
  @keyframes dot-pulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%            { transform: scale(1);   opacity: 1;   }
  }
  @keyframes splash-fade-out {
    0%   { opacity: 1; }
    100% { opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    #qalb-splash, #qalb-splash * {
      animation-name: none !important;
    }
    #qalb-splash[data-phase="exiting"] {
      animation-name: splash-fade-out !important;
      animation-duration: 200ms !important;
      animation-fill-mode: forwards !important;
    }
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

    const exitTimer = setTimeout(() => setPhase("exiting"), SPLASH_HOLD_MS);
    const goneTimer = setTimeout(() => setPhase("gone"), SPLASH_HOLD_MS + SPLASH_EXIT_MS);

    // Any deliberate input means the user wants the app, not the animation.
    const skip = () => setPhase((p) => (p === "visible" ? "exiting" : p));
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(goneTimer);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, []);

  // Once skipped early, still unmount after the exit finishes.
  useEffect(() => {
    if (phase !== "exiting") return undefined;
    const t = setTimeout(() => setPhase("gone"), SPLASH_EXIT_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // Fully unmounted — render nothing
  if (phase === "gone") return null;

  return (
    <>
      {/* Inject keyframes once */}
      <style>{KEYFRAME_CSS}</style>

      {/* ── Overlay ─────────────────────────────────────────────────────── */}
      <div
        id="qalb-splash"
        aria-hidden="true"
        data-phase={phase}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "oklch(0.09 0.022 155)",
          animation:
            phase === "exiting"
              ? `splash-exit ${SPLASH_EXIT_MS}ms var(--ease-in-out, cubic-bezier(0.77, 0, 0.175, 1)) forwards`
              : "none",
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
            animation: "bismillah-fade-in 0.8s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)) 0.1s both",
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
              "bismillah-fade-in 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both, " +
              "gold-shimmer 2.5s linear 0.6s infinite",
          }}
        >
          بسم الله الرحمن الرحيم
        </p>

        {/* ── Expanding gold line beneath ────────────────────────────── */}
        <div
          style={{
            height: "1px",
            width: "120px",
            background: "linear-gradient(90deg, transparent, #c8a951, transparent)",
            animation: "line-expand 0.9s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)) 0.5s both",
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
            animation: "bismillah-fade-in 0.6s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)) 0.7s both",
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
            animation: "bismillah-fade-in 0.5s var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)) 0.85s both",
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
