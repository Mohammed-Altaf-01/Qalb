/**
 * @fileoverview Navigation Component
 *
 * Renders two navigation surfaces:
 *  1. Top header bar — Kaaba home icon + "Qalb" logo + tagline
 *  2. Bottom mobile nav bar — Home, Discover, Goals, Library tabs
 *
 * The bottom nav is fixed to the viewport on mobile (< md breakpoint).
 * Active tab is highlighted in warm gold. Hover states dim slightly for
 * a premium, tactile aesthetic.
 *
 * Client Component — reads pathname for active-tab highlighting.
 */

"use client";

import { BookMarked, BookOpen, Compass, Home, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Kaaba Icon — geometric SVG used as the home-button logomark
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal geometric Kaaba SVG with an inline gold gradient.
 * Renders the cube body, horizontal Kiswa cloth band, arched door, and drape peak.
 * Uses a self-contained <linearGradient> so it renders correctly without any
 * external CSS — no need for the text-gradient-gold hack on SVG strokes.
 *
 * @param {{ size?: number, className?: string }} props
 */
function KaabaIcon({ size = 22, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="kaaba-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c8a951" />
          <stop offset="50%" stopColor="#e0c275" />
          <stop offset="100%" stopColor="#c8a951" />
        </linearGradient>
      </defs>

      {/* Cube body */}
      <rect x="3" y="7" width="18" height="14" rx="1.2" stroke="url(#kaaba-gold)" strokeWidth="1.6" />

      {/* Kiswa — horizontal cloth band */}
      <line x1="3" y1="12" x2="21" y2="12" stroke="url(#kaaba-gold)" strokeWidth="1.4" />

      {/* Arched door */}
      <path
        d="M10.5 21 L10.5 16.5 Q10.5 14 12 14 Q13.5 14 13.5 16.5 L13.5 21"
        stroke="url(#kaaba-gold)"
        strokeWidth="1.4"
      />

      {/* Top drape peak */}
      <path d="M3 7 L12 3.5 L21 7" stroke="url(#kaaba-gold)" strokeWidth="1.4" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Nav Item Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Defines each tab in the bottom navigation bar.
 * Adding a new tab only requires adding an entry here.
 *
 * @type {Array<{label: string, href: string, icon: React.ComponentType}>}
 */
const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Read", href: "/read", icon: BookOpen },
  { label: "Discover", href: "/discover", icon: Compass },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Library", href: "/library", icon: BookMarked },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Application navigation shell — top header + bottom mobile tabs.
 */
export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Top Header Bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 md:px-8 h-14">
          {/* Logo + Kaaba home button */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group transition-opacity duration-200 hover:opacity-70"
            aria-label="Qalb — home"
          >
            <KaabaIcon size={22} className="shrink-0 transition-transform duration-200 group-hover:scale-95" />
            <span className="font-semibold text-lg tracking-tight text-gradient-gold">Qalb</span>
          </Link>

          {/* Tagline */}
          <span className="hidden sm:block text-xs text-muted-foreground/70 italic tracking-wide">
            Your Daily Quran Companion
          </span>
        </div>
      </header>

      {/* ── Bottom Mobile Navigation Bar ───────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border/50 bg-background/90 backdrop-blur-md">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all duration-200 min-w-0",
                  isActive ? "text-accent" : "text-muted-foreground hover:text-foreground hover:opacity-70",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  className={cn("transition-transform duration-200", isActive && "scale-110")}
                />
                <span className="text-[10px] font-medium truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
