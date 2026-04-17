/**
 * @fileoverview Navigation Component
 *
 * Renders two navigation surfaces:
 *  1. Top header bar — app logo + (future: user avatar/login)
 *  2. Bottom mobile nav bar — Home, Discover, Goals, Library tabs
 *
 * The bottom nav is fixed to the viewport on mobile (< md breakpoint)
 * and hidden on desktop, where a sidebar or top nav is sufficient.
 *
 * This is a Client Component because it reads the current pathname
 * to highlight the active tab.
 */

"use client";

import { BookMarked, Compass, Home, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

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
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            {/* Arabic ق (Qaf) as the logomark */}
            <span className="text-2xl font-bold text-gradient-gold arabic-text-sm leading-none">ق</span>
            <span className="font-semibold text-lg tracking-tight text-gradient-gold">Qalb</span>
          </Link>

          {/* Tagline — visible on larger screens */}
          <span className="hidden sm:block text-xs text-muted-foreground">Your Daily Quran Companion</span>
        </div>
      </header>

      {/* ── Bottom Mobile Navigation Bar ───────────────────────────────── */}
      {/* Fixed to bottom on mobile, hidden on desktop (md+) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border/50 bg-background/90 backdrop-blur-md">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            // Exact match for home, prefix match for all others
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-0",
                  isActive ? "text-accent" /* gold when active  */ : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  className={cn("transition-transform", isActive && "scale-110")}
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
