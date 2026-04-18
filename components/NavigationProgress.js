/**
 * @fileoverview NavigationProgress — Top Loading Bar for Route Transitions
 *
 * Wraps `nextjs-toploader` with Qalb's gold accent color so the loading
 * indicator matches the app's design system.
 *
 * The bar appears whenever Next.js is loading a new route and disappears
 * once the new page is fully rendered.
 *
 * This must be a Client Component because nextjs-toploader uses browser APIs.
 */

"use client";

import NextTopLoader from "nextjs-toploader";

/**
 * Renders the gold navigation progress bar.
 * Drop this once into the root layout — it works app-wide automatically.
 */
export default function NavigationProgress() {
  return (
    <NextTopLoader
      /** Gold accent — matches --accent in globals.css */
      color="#c8a951"
      /** Initial position (% of bar width at the start) */
      initialPosition={0.12}
      /** Crawl speed in ms */
      crawlSpeed={180}
      /** Bar height in px */
      height={2.5}
      /** Animate crawl between ticks */
      crawl={true}
      /** Show spinner — disabled, the bar alone is enough */
      showSpinner={false}
      /** Ease timing for the bar animation */
      easing="ease"
      /** How fast the bar moves in ms */
      speed={220}
      /** Shadow color — subtle gold glow */
      shadow="0 0 8px #c8a951, 0 0 4px #c8a951aa"
      /** z-index — above everything but below the splash */
      zIndex={8000}
    />
  );
}
