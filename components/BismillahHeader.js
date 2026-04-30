"use client";

import { useEffect, useState } from "react";

import dynamic from "next/dynamic";

const SESSION_KEY = "qalb_bismillah_shown";

// Lazy-load Three.js scene — never blocks first paint
const KaabaScene = dynamic(() => import("./KaabaScene"), { ssr: false });

export default function BismillahHeader() {
  const [hovered, setHovered] = useState(false);
  const [ringKey, setRingKey] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem(SESSION_KEY);
    if (!seen) {
      setAnimate(true);
      sessionStorage.setItem(SESSION_KEY, "1");
    }
    // Mount canvas after text is painted — Three.js never competes with LCP
    const t = setTimeout(() => setSceneReady(true), 500);
    return () => clearTimeout(t);
  }, []);

  function handleEnter() {
    setHovered(true);
    setRingKey((k) => k + 1);
  }

  const glowFilter = hovered
    ? "drop-shadow(0 0 8px rgba(200,169,81,0.9)) drop-shadow(0 0 28px rgba(200,169,81,0.45)) drop-shadow(0 0 56px rgba(200,169,81,0.18))"
    : "drop-shadow(0 0 0px transparent)";

  return (
    <section className="select-none mb-4">
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/40 backdrop-blur-sm px-3.5 py-4 md:px-5 md:py-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 18%, oklch(0.72 0.13 75 / 0.11), transparent 42%), radial-gradient(circle at 86% 70%, oklch(0.68 0.13 155 / 0.14), transparent 44%)",
          }}
        />

        <div className="relative flex flex-col items-center gap-3.5 md:flex-row md:items-center md:justify-between md:gap-5">
          {/* ── Kaaba visual block ───────────────────────────────────────── */}
          <div className="w-full md:w-auto flex justify-center">
            <div
              className="relative rounded-2xl border border-accent/25 bg-background/65 shadow-xl shadow-black/25 p-1.5"
              style={{ width: 168, height: 168 }}
              aria-hidden="true"
            >
              <div
                className="absolute -inset-1 rounded-[1.15rem]"
                style={{
                  background:
                    "radial-gradient(circle, oklch(0.72 0.13 75 / 0.2) 0%, oklch(0.72 0.13 75 / 0.03) 45%, transparent 72%)",
                }}
              />
              <div className="relative w-full h-full rounded-xl overflow-hidden bg-background/60">
                {/* Fallback only before the rotating scene is mounted */}
                {!sceneReady && <div className="absolute inset-0 grid place-items-center text-5xl opacity-45 pointer-events-none">🕋</div>}
                {sceneReady ? (
                  <KaabaScene />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
            </div>
          </div>

          {/* ── Headline + Bismillah ────────────────────────────────────── */}
          <div
            className="relative text-center md:text-left"
            onMouseEnter={handleEnter}
            onMouseLeave={() => setHovered(false)}
            style={{ filter: glowFilter, transition: "filter 0.55s ease" }}
          >
            <div key={ringKey} aria-hidden="true" className="absolute inset-0 pointer-events-none">
              {hovered && (
                <>
                  <div
                    className="absolute rounded-[50%] border border-accent/45 bismillah-ring-1"
                    style={{ inset: "-18px -36px" }}
                  />
                  <div
                    className="absolute rounded-[50%] border border-accent/25 bismillah-ring-2"
                    style={{ inset: "-18px -36px" }}
                  />
                </>
              )}
            </div>

            <p className="text-[10px] md:text-[11px] uppercase tracking-[0.16em] text-accent/80 mb-1.5">Begin with remembrance</p>
            <h1
              className={cn(
                "arabic-text arabic-text-display text-gradient-gold font-bold relative text-center md:text-left",
                animate ? "bismillah-animate" : "",
              )}
            >
              بسم الله الرحمن الرحيم
            </h1>
            <p className="mt-3 text-sm md:text-base text-foreground/78 max-w-xl leading-relaxed">
              Quran for your daily moments. Read, reflect, and reconnect one verse at a time.
            </p>

            <div className="mt-2.5 w-20 h-px bg-accent/30 mx-auto md:mx-0" />
          </div>
        </div>
      </div>
    </section>
  );
}

// cn utility inline to avoid import cycle with ui components
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
