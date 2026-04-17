/**
 * @fileoverview Home Page — Daily Verse Dashboard
 *
 * The landing experience for Qalb. Shows:
 *  1. A warm greeting with the current date
 *  2. The daily verse (server-fetched, consistent for all users on same day)
 *  3. A streak counter motivating users to return each day
 *  4. Quick-action cards navigating to Discover, Goals, and Library
 *
 * This is a Server Component — the daily verse is fetched at request time
 * on the server, giving instant first-paint with no loading state.
 */
import { BookMarked, Compass, Flame, Target } from "lucide-react";
import Link from "next/link";

import VerseCard from "@/components/VerseCard";

// ─────────────────────────────────────────────────────────────────────────────
// Data Fetching (Server-side)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches today's verse from our own API route (which proxies Quran Foundation).
 * Running on the server means no API keys are exposed to the browser.
 *
 * @returns {Promise<{verse: object, chapter: object, date: string}|null>}
 */
async function fetchDailyVerse() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/verse/daily`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
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
 * Displays the current date in a human-friendly format with an Arabic greeting.
 * @param {object} props
 * @param {string} [props.dateIso] - ISO date string (YYYY-MM-DD)
 */
function DateHeader({ dateIso }) {
  const date = dateIso ? new Date(dateIso) : new Date();
  const formatted = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="text-center mb-6">
      {/* Basmala — the traditional opening phrase */}
      <h1 className="text-2xl font-bold text-gradient-gold mb-1 arabic-text">بسم الله الرحمن الرحيم</h1>
      <p className="text-xs text-muted-foreground mt-2">{formatted}</p>
    </div>
  );
}

/**
 * Streak widget — motivates daily return with a flame icon and count.
 * The streak count is 0 until the user authenticates via OAuth2.
 *
 * @param {object} props
 * @param {number} [props.streakDays=0]
 */
function StreakWidget({ streakDays = 0 }) {
  const hasStreak = streakDays > 0;

  return (
    <div className="flex items-center justify-center gap-3 mb-6 p-4 rounded-2xl bg-card border border-border/50">
      {/* Flame icon — pulses when there is an active streak */}
      <span
        className={hasStreak ? "animate-streak-pulse" : "opacity-40"}
        role="img"
        aria-label={`${streakDays} day streak`}
      >
        <Flame
          size={32}
          className={hasStreak ? "text-orange-400" : "text-muted-foreground"}
          fill={hasStreak ? "currentColor" : "none"}
        />
      </span>

      <div>
        <p className="text-2xl font-bold text-foreground">
          {streakDays}
          <span className="text-sm font-normal text-muted-foreground ml-1">day{streakDays !== 1 ? "s" : ""}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {hasStreak ? "Keep your streak alive — read today!" : "Start your streak — read today's verse"}
        </p>
      </div>
    </div>
  );
}

/**
 * Quick-action navigation cards beneath the daily verse.
 * Each card is a styled link to a core section of the app.
 */
function QuickActions() {
  const actions = [
    {
      href: "/discover",
      icon: Compass,
      label: "Discover",
      description: "Find verses for your moment",
      color: "text-blue-400",
      bg: "bg-blue-400/10 border-blue-400/20",
    },
    {
      href: "/goals",
      icon: Target,
      label: "My Goals",
      description: "Track your journey",
      color: "text-green-400",
      bg: "bg-green-400/10 border-green-400/20",
    },
    {
      href: "/library",
      icon: BookMarked,
      label: "Library",
      description: "Your saved verses",
      color: "text-purple-400",
      bg: "bg-purple-400/10 border-purple-400/20",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mt-6">
      {actions.map(({ href, icon: Icon, label, description, color, bg }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl border ${bg} transition-all hover:scale-105 active:scale-95`}
        >
          <Icon size={22} className={color} />
          <div className="text-center">
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">{description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Home page — Server Component for instant first paint.
 */
export default async function HomePage() {
  const dailyData = await fetchDailyVerse();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* ── Date Greeting ──────────────────────────────────────────────── */}
      <DateHeader dateIso={dailyData?.date} />

      {/* ── Streak Widget ──────────────────────────────────────────────── */}
      <StreakWidget streakDays={0} />

      {/* ── Daily Verse Section ────────────────────────────────────────── */}
      <section aria-labelledby="daily-verse-heading">
        <div className="flex items-center gap-2 mb-3">
          <h2 id="daily-verse-heading" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Verse of the Day
          </h2>
          <div className="flex-1 h-px bg-border/50" />
        </div>

        {dailyData?.verse ? (
          <VerseCard verse={dailyData.verse} chapterName={dailyData.chapter?.name_simple} />
        ) : (
          /* Graceful fallback when the API is unreachable */
          <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
            <p className="text-muted-foreground text-sm">
              Could not load today&apos;s verse. Check your connection and refresh.
            </p>
          </div>
        )}
      </section>

      {/* ── Quick Actions ───────────────────────────────────────────────── */}
      <QuickActions />

      {/* ── Inspirational Footer ────────────────────────────────────────── */}
      <p className="text-center text-xs text-muted-foreground mt-8 italic">
        &quot;The best of you are those who learn the Quran and teach it.&quot;
        <span className="block not-italic mt-1 text-[10px]">— Prophet Muhammad ﷺ (Sahih al-Bukhari)</span>
      </p>
    </div>
  );
}
