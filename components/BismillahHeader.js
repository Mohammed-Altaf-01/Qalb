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
    <div className="select-none mb-5">
      {/*
        Desktop: [Kaaba 3D] | [Bismillah text]  — side by side
        Mobile:  [Bismillah text] only            — Kaaba hidden to save resources
      */}
      <div className="flex items-center justify-center gap-6 md:gap-10">
        {/* ── Kaaba 3D — desktop only ──────────────────────────────────── */}
        {sceneReady && (
          <div className="hidden md:block shrink-0" style={{ width: 260, height: 260 }} aria-hidden="true">
            <KaabaScene />
          </div>
        )}

        {/* ── Bismillah text ────────────────────────────────────────────── */}
        <div
          className="text-center md:text-left"
          onMouseEnter={handleEnter}
          onMouseLeave={() => setHovered(false)}
          style={{ filter: glowFilter, transition: "filter 0.55s ease" }}
        >
          {/* Radial hover glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none rounded-[50%] transition-opacity duration-700 absolute"
            style={{
              inset: "-32px -56px",
              background: "radial-gradient(ellipse at center, oklch(0.72 0.13 75 / 0.16) 0%, transparent 68%)",
              opacity: hovered ? 1 : 0,
            }}
          />

          {/* Energy rings on hover */}
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

          <h1
            className={cn(
              "arabic-text text-gradient-gold font-bold relative",
              "text-3xl md:text-4xl",
              animate ? "bismillah-animate" : "",
            )}
          >
            بسم الله الرحمن الرحيم
          </h1>

          {/* Subtle separator line — desktop only, under the Arabic */}
          <div className="hidden md:block mt-4 w-16 h-px bg-accent/30" />
        </div>
      </div>
    </div>
  );
}

// cn utility inline to avoid import cycle with ui components
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
