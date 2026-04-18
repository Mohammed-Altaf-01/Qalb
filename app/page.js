/**
 * @fileoverview Home Page — Daily Verse Dashboard
 *
 * Layout:
 *  - Mobile  : single column — greeting → streak → verse → quick-actions → hadith
 *  - Desktop : 2-column grid (lg:col-span-3 main | lg:col-span-2 sidebar)
 *
 * Server Component — daily verse fetched at request time so no loading flash.
 * DailyVerseSection and HadithCard are Client Components (imported below) so
 * they can handle their own refresh logic without re-rendering the whole page.
 */
import { BookMarked, Compass, Flame, Target } from "lucide-react";
import Link from "next/link";

import BismillahHeader from "@/components/BismillahHeader";
import DailyVerseSection from "@/components/DailyVerseSection";
import HadithCard from "@/components/HadithCard";

// ─────────────────────────────────────────────────────────────────────────────
// Data Fetching (Server-side)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches today's verse from our own API route (Quran Foundation proxy).
 * Runs on the server — no API keys exposed to the browser.
 *
 * @returns {Promise<{verse: object, chapter: object, date: string}|null>}
 */
async function fetchDailyVerse() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/verse/daily`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Streak widget — motivates daily return with a flame icon and count.
 * @param {{ streakDays?: number }} props
 */
function StreakWidget({ streakDays = 0 }) {
  const hasStreak = streakDays > 0;

  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 transition-all duration-200 hover:brightness-90">
      <span
        className={hasStreak ? "animate-streak-pulse" : "opacity-40"}
        role="img"
        aria-label={`${streakDays} day streak`}
      >
        <Flame
          size={36}
          className={hasStreak ? "text-orange-400" : "text-muted-foreground"}
          fill={hasStreak ? "currentColor" : "none"}
        />
      </span>
      <div className="flex-1">
        <p className="text-2xl font-bold text-foreground leading-none">
          {streakDays}
          <span className="text-sm font-normal text-muted-foreground ml-1.5">day{streakDays !== 1 ? "s" : ""}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {hasStreak ? "Keep your streak alive — read today!" : "Start your streak — read today's verse"}
        </p>
      </div>
      {hasStreak && (
        <div className="text-right">
          <p className="text-[10px] text-accent/70 font-medium uppercase tracking-wider">Active</p>
        </div>
      )}
    </div>
  );
}

/**
 * Quick-action sidebar navigation links.
 * Mobile: 3-column icon grid. Desktop: stacked list with descriptions.
 */
function QuickActions() {
  const actions = [
    {
      href: "/discover",
      icon: Compass,
      label: "Discover",
      description: "Find verses for your moment",
      color: "text-blue-400",
      bg: "bg-blue-400/10 border-blue-400/20 hover:bg-blue-400/15",
    },
    {
      href: "/goals",
      icon: Target,
      label: "My Goals",
      description: "Track your journey",
      color: "text-emerald-400",
      bg: "bg-emerald-400/10 border-emerald-400/20 hover:bg-emerald-400/15",
    },
    {
      href: "/library",
      icon: BookMarked,
      label: "Library",
      description: "Your saved verses",
      color: "text-purple-400",
      bg: "bg-purple-400/10 border-purple-400/20 hover:bg-purple-400/15",
    },
  ];

  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="flex-1 h-px bg-border/60" />
        Quick Access
        <span className="flex-1 h-px bg-border/60" />
      </p>

      {/* Mobile: 3-column grid | Desktop (sidebar): stacked list */}
      <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
        {actions.map(({ href, icon: Icon, label, description, color, bg }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col lg:flex-row items-center lg:items-center gap-2 lg:gap-3 p-3 rounded-xl border ${bg}
              transition-all duration-200 hover:brightness-90 hover:opacity-90 active:scale-95`}
          >
            <div className={`p-1.5 rounded-lg shrink-0`}>
              <Icon size={18} className={color} strokeWidth={1.75} />
            </div>
            <div className="text-center lg:text-left min-w-0">
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight hidden lg:block truncate">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Home page — Server Component for instant first paint.
 * Desktop layout: 3/5 main column + 2/5 sidebar.
 * DailyVerseSection and HadithCard are Client Components — they own
 * their own refresh state without re-running this Server Component.
 */
export default async function HomePage() {
  const dailyData = await fetchDailyVerse();

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-6">
      {/* ── Basmala + Date — animated client component ─────────────────── */}
      <BismillahHeader dateIso={dailyData?.date} />

      {/* ── 2-column grid on desktop, single column on mobile ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10 items-start">
        {/* ── Main column: Streak + Daily Verse ──────────────────────── */}
        <div className="lg:col-span-3 space-y-5">
          <StreakWidget streakDays={0} />

          <section aria-labelledby="daily-verse-heading">
            <div className="flex items-center gap-2 mb-3">
              <h2
                id="daily-verse-heading"
                className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest"
              >
                Verse of the Day
              </h2>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* Client Component — handles refresh without re-rendering this page */}
            <DailyVerseSection
              initialVerse={dailyData?.verse ?? null}
              initialChapterName={dailyData?.chapter?.name_simple}
            />
          </section>
        </div>

        {/* ── Sidebar: Quick Actions + Hadith ────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          <QuickActions />
          {/* Client Component — owns its own hadith cycling state */}
          <HadithCard />
        </div>
      </div>
    </div>
  );
}
