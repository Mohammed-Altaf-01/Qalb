"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Award,
  BookMarked,
  BookOpen,
  CalendarDays,
  Flame,
  Footprints,
  LogIn,
  LogOut,
  Star,
  Target,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";

import UserJourneyHistory from "@/components/UserJourneyHistory";
import { Button } from "@/components/ui/button";
import { buildHeatmapDayCells, heatmapToneClass, todayLocalDayKey } from "@/lib/activity-heatmap";
import { bucketDayKeyLocal, toLocalDayKey } from "@/lib/local-calendar-day";
import { BADGES, DEEDS, LEVELS, getDailyChallenge, getLevelInfo } from "@/lib/gamification";
import { QURAN_FOUNDATION_PROVIDER_ID } from "@/lib/constants/auth";
import { LS_APP_ACTIVE_DAY, QALB_TIME_TRACKING_UPDATED_EVENT } from "@/lib/qalb-storage-keys";
import { useGamification } from "@/lib/useGamification";
import { ACCOUNT_STORAGE_SYNCED_EVENT, LS_TIME_TRACKING } from "@/lib/user-app-sync-bridge";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// XP Progress Bar
// ─────────────────────────────────────────────────────────────────────────────

function XPBar({ xp }) {
  const info = getLevelInfo(xp);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className={cn("font-semibold", info.current.color)}>
          {info.current.icon} {info.current.title}
        </span>
        {info.next && (
          <span className="text-muted-foreground">
            {info.xpIntoLevel} / {info.xpNeeded} XP → {info.next.title}
          </span>
        )}
        {!info.next && <span className="text-accent font-semibold">Max Level!</span>}
      </div>
      <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
          style={{ width: `${info.progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-right">{xp} total XP</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Level ladder
// ─────────────────────────────────────────────────────────────────────────────

function LevelLadder({ currentXp }) {
  const currentLevel = getLevelInfo(currentXp).current.level;

  return (
    <div className="space-y-2">
      {LEVELS.map((l) => {
        const isUnlocked = currentXp >= l.minXp;
        const isCurrent = l.level === currentLevel;

        return (
          <div
            key={l.level}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors",
              isCurrent
                ? "border-accent/50 bg-accent/10"
                : isUnlocked
                  ? "border-border/40 bg-card/40"
                  : "border-border/20 bg-card/20 opacity-40",
            )}
          >
            <div
              className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold", l.bg, l.color)}
            >
              {l.level}
            </div>
            <div className="flex-1">
              <p className={cn("font-semibold text-sm", isCurrent ? l.color : "text-foreground/70")}>
                {l.title}
                <span className="ml-2 font-normal text-muted-foreground arabic-text text-xs">{l.titleAr}</span>
              </p>
              <p className="text-xs text-muted-foreground">{l.minXp} XP required</p>
            </div>
            {isCurrent && (
              <span className="text-xs font-medium text-accent px-2 py-0.5 rounded-full border border-accent/30 bg-accent/10">
                Current
              </span>
            )}
            {isUnlocked && !isCurrent && <span className="text-xs text-primary">✓</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Badges grid
// ─────────────────────────────────────────────────────────────────────────────

function BadgesGrid({ earned }) {
  const allBadges = Object.values(BADGES);
  const earnedSet = new Set(earned ?? []);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {allBadges.map((badge) => {
        const isEarned = earnedSet.has(badge.id);
        return (
          <div
            key={badge.id}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl p-3 border text-center transition-all",
              isEarned ? "border-accent/30 bg-accent/5" : "border-border/20 bg-card/20 opacity-30 grayscale",
            )}
          >
            <span className="text-2xl">{badge.icon}</span>
            <p className="text-[10px] font-medium leading-tight text-foreground/80">{badge.title}</p>
            {isEarned && badge.xp > 0 && <span className="text-[9px] text-accent">+{badge.xp} XP</span>}
          </div>
        );
      })}
    </div>
  );
}

function DeedsGrid({ earned }) {
  const allDeeds = Object.values(DEEDS);
  const earnedSet = new Set(earned ?? []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {allDeeds.map((deed) => {
        const isEarned = earnedSet.has(deed.id);
        return (
          <div
            key={deed.id}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl p-3 border text-center transition-all",
              isEarned ? "border-primary/30 bg-primary/5" : "border-border/20 bg-card/20 opacity-35 grayscale",
            )}
          >
            <span className="text-2xl">{deed.icon}</span>
            <p className="text-[10px] font-medium leading-tight text-foreground/80">{deed.title}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Challenge card
// ─────────────────────────────────────────────────────────────────────────────

function DailyChallenge({ state }) {
  const challenge = getDailyChallenge();
  const completed = state?.challenge_completed;

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 space-y-3",
        completed ? "border-primary/30 bg-primary/5" : "border-accent/30 bg-accent/5",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={18} className={completed ? "text-primary" : "text-accent"} />
          <span className="font-semibold text-sm">Daily Challenge</span>
        </div>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full border",
            completed ? "text-primary border-primary/30 bg-primary/10" : "text-accent border-accent/30 bg-accent/10",
          )}
        >
          {completed ? "✓ Completed" : `+${challenge.xp} XP`}
        </span>
      </div>
      <div>
        <p className="font-medium text-sm text-foreground">{challenge.title}</p>
        <p className="text-xs text-muted-foreground mt-1">{challenge.desc}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats row
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color = "text-primary" }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4 flex flex-col gap-1">
      <Icon size={18} className={color} />
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function localCalendarNoonAtOffset(deltaDays) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + deltaDays, 12, 0, 0, 0);
}

function buildMinutesSeries(events, localByDay = new Map()) {
  const dailyMinutes = new Map();
  for (const event of events ?? []) {
    const key = bucketDayKeyLocal(event.created_at);
    const mins = event?.event_type === "time_spent" ? Number(event?.metadata?.minutes ?? 0) : 0;
    if (!Number.isFinite(mins) || mins <= 0) continue;
    dailyMinutes.set(key, (dailyMinutes.get(key) ?? 0) + mins);
  }
  for (const [key, mins] of localByDay.entries()) {
    const n = Number(mins);
    if (!Number.isFinite(n) || n <= 0) continue;
    dailyMinutes.set(key, Math.max(Number(dailyMinutes.get(key) ?? 0), n));
  }
  return dailyMinutes;
}

function buildTrendData(dailyMinutes, mode) {
  if (mode === "daily") {
    const out = [];
    for (let i = 29; i >= 0; i--) {
      const key = toLocalDayKey(localCalendarNoonAtOffset(-i));
      out.push({ label: key.slice(5), minutes: dailyMinutes.get(key) ?? 0 });
    }
    return out;
  }
  if (mode === "weekly") {
    const out = [];
    for (let i = 11; i >= 0; i--) {
      const end = localCalendarNoonAtOffset(-i * 7);
      let mins = 0;
      for (let d = 0; d < 7; d++) {
        const day = new Date(end.getFullYear(), end.getMonth(), end.getDate() - d, 12, 0, 0, 0);
        const key = toLocalDayKey(day);
        mins += dailyMinutes.get(key) ?? 0;
      }
      out.push({ label: `W${12 - i}`, minutes: mins });
    }
    return out;
  }
  const out = [];
  const anchor = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1, 12, 0, 0, 0);
    const monthPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let mins = 0;
    for (const [key, value] of dailyMinutes) {
      if (key.startsWith(monthPrefix)) mins += Number(value) || 0;
    }
    out.push({ label: d.toLocaleDateString(undefined, { month: "short" }), minutes: mins });
  }
  return out;
}

function ActivityHeatmap({ events, localByDay }) {
  const [dayBump, setDayBump] = useState(0);

  useEffect(() => {
    function bump() {
      setDayBump((n) => n + 1);
    }
    window.addEventListener("storage", bump);
    window.addEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, bump);
    return () => {
      window.removeEventListener("storage", bump);
      window.removeEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, bump);
    };
  }, []);

  const todayTouch = useMemo(() => {
    try {
      return localStorage.getItem(LS_APP_ACTIVE_DAY) === todayLocalDayKey();
    } catch {
      return false;
    }
  }, [dayBump]);

  const days = useMemo(() => {
    return buildHeatmapDayCells(events ?? [], {
      todayClientTouched: todayTouch,
      minutesByDay: localByDay,
    });
  }, [events, localByDay, todayTouch]);
  const maxIntensity = Math.max(1, ...days.map((d) => d.intensity));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <CalendarDays size={14} className="text-emerald-400" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity heatmap</p>
      </div>
      <p className="text-[10px] text-muted-foreground/80">
        Darker green = more actions that day; opening the app today adds a gentle highlight.
      </p>
      <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-1">
        {days.map((d) => (
          <div
            key={d.key}
            title={`${d.key}: ${d.count} events${d.hourSpread > 0 ? ` · ~${d.hourSpread} active hours` : ""}`}
            className={`h-3.5 w-3.5 rounded-[3px] border transition-colors ${heatmapToneClass(d.intensity, maxIntensity)}`}
          />
        ))}
      </div>
    </div>
  );
}

function MinutesTrendChart({ events, localByDay }) {
  const [mode, setMode] = useState("daily");
  const data = useMemo(() => {
    const dailyMinutes = buildMinutesSeries(events, localByDay);
    return buildTrendData(dailyMinutes, mode);
  }, [events, localByDay, mode]);

  const maxMinutes = Math.max(1, ...data.map((d) => d.minutes));
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(1, data.length - 1)) * 100;
      const y = 100 - (d.minutes / maxMinutes) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Engagement trend (minutes)</p>
        <div className="flex items-center gap-1 rounded-lg border border-border/35 bg-muted/25 p-0.5">
          {["daily", "weekly", "monthly"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-2 py-1 text-[10px] rounded-md capitalize border transition-colors",
                mode === m
                  ? "bg-accent/20 text-accent border-accent/35"
                  : "text-muted-foreground border-transparent hover:text-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border/30 bg-card/35 p-3">
        <svg viewBox="0 0 100 100" className="w-full h-32">
          <polyline points={points} fill="none" stroke="oklch(0.68 0.13 155)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{data[0]?.label ?? ""}</span>
          <span>{data[data.length - 1]?.label ?? ""}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main profile page
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { state } = useGamification();
  const [tab, setTab] = useState("overview");
  const [activityEvents, setActivityEvents] = useState([]);
  const [activityEnabled, setActivityEnabled] = useState(false);
  const [trackingBump, setTrackingBump] = useState(0);

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "journey", label: "Journey", icon: Footprints },
    { id: "levels", label: "Levels" },
    { id: "badges", label: "Badges" },
    { id: "deeds", label: "Deeds" },
    { id: "activity", label: "Activity" },
  ];

  useEffect(() => {
    if (status !== "authenticated") {
      setActivityEvents([]);
      setActivityEnabled(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/activity?days=365");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setActivityEnabled(data.enabled === true);
        setActivityEvents(Array.isArray(data.events) ? data.events : []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    function bump() {
      setTrackingBump((n) => n + 1);
    }
    window.addEventListener("storage", bump);
    window.addEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, bump);
    window.addEventListener(QALB_TIME_TRACKING_UPDATED_EVENT, bump);
    return () => {
      window.removeEventListener("storage", bump);
      window.removeEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, bump);
      window.removeEventListener(QALB_TIME_TRACKING_UPDATED_EVENT, bump);
    };
  }, []);

  const localTrackingByDay = useMemo(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_TIME_TRACKING) ?? "{}");
      const byDay = raw?.byDay && typeof raw.byDay === "object" ? raw.byDay : {};
      return new Map(Object.entries(byDay));
    } catch {
      return new Map();
    }
  }, [trackingBump]);

  if (status === "loading" || !state) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const levelInfo = getLevelInfo(state.xp);
  const earnedBadges = state.badges?.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* ── Profile header ──────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
          {session?.user?.image ? (
            <img src={session.user.image} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <User size={28} className="text-primary" />
          )}
        </div>

        {/* Name + level */}
        <div className="flex-1 min-w-0 space-y-1">
          <h1 className="font-bold text-xl text-foreground truncate">{session?.user?.name ?? "Guest Reader"}</h1>
          {session?.user?.email && <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>}
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
              levelInfo.current.bg,
              levelInfo.current.color,
              "border-current/20",
            )}
          >
            {levelInfo.current.title}
          </span>
        </div>

        {/* Sign in / out */}
        {status === "authenticated" ? (
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })} className="shrink-0">
            <LogOut size={14} className="mr-1.5" />
            Sign Out
          </Button>
        ) : (
          <Button size="sm" onClick={() => signIn(QURAN_FOUNDATION_PROVIDER_ID)} className="shrink-0">
            <LogIn size={14} className="mr-1.5" />
            Sign In
          </Button>
        )}
      </div>

      {/* XP bar */}
      <XPBar xp={state.xp} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Zap} label="Total XP" value={state.xp} color="text-accent" />
        <StatCard
          icon={Award}
          label="Badges"
          value={`${earnedBadges}/${Object.keys(BADGES).length}`}
          color="text-primary"
        />
        <StatCard icon={BookOpen} label="Surahs Read" value={state.surahs_read?.length ?? 0} color="text-sky-400" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Flame} label="Deeds Earned" value={(state.deeds ?? []).length} color="text-primary" />
        <StatCard icon={Target} label="Minutes Spent" value={state.total_minutes_spent ?? 0} color="text-accent" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/khatm"
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border/40 hover:border-accent/40 hover:bg-accent/5 transition-colors"
        >
          <BookMarked size={13} aria-hidden /> Khatm
        </Link>
        <Link
          href="/hifz"
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border/40 hover:border-accent/40 hover:bg-accent/5 transition-colors"
        >
          <Star size={13} aria-hidden /> Hifz
        </Link>
        <Link
          href="/goals"
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border/40 hover:border-accent/40 hover:bg-accent/5 transition-colors"
        >
          <Target size={13} aria-hidden /> Goals
        </Link>
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border/40 hover:border-accent/40 hover:bg-accent/5 transition-colors"
        >
          <BookOpen size={13} aria-hidden /> Library
        </Link>
      </div>

      {/* Daily challenge */}
      <DailyChallenge state={state} />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted/30 p-1 border border-border/30">
        {TABS.map((t) => {
          const TabIcon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 py-2 text-xs font-medium rounded-lg transition-all inline-flex items-center justify-center gap-1",
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {TabIcon ? <TabIcon size={12} className="opacity-70 shrink-0 hidden sm:block" aria-hidden /> : null}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Recent XP</h2>
            {(state.actionLog ?? []).slice(0, 10).length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Start reading to earn XP!</p>
            ) : (
              <div className="space-y-2">
                {(state.actionLog ?? []).slice(0, 10).map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-4 rounded-xl bg-card/40 border border-border/30"
                  >
                    <span className="text-sm text-foreground/80">{entry.label}</span>
                    <span className="text-sm font-semibold text-accent">+{entry.xp} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2 border-t border-border/25">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Your activity</h2>
            <ActivityHeatmap events={activityEvents} localByDay={localTrackingByDay} />
            <MinutesTrendChart events={activityEvents} localByDay={localTrackingByDay} />
            {!activityEnabled && status === "authenticated" && (
              <p className="text-xs text-muted-foreground">
                Cloud activity logging is currently unavailable, so local tracked minutes are used as fallback.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === "journey" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Your saved Key Themes, Discover searches, Reflect prompts, and verse chats. Sign in to sync across devices.
          </p>
          <UserJourneyHistory />
        </div>
      )}

      {tab === "levels" && <LevelLadder currentXp={state.xp} />}

      {tab === "badges" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {earnedBadges} of {Object.keys(BADGES).length} badges earned
          </p>
          <BadgesGrid earned={state.badges} />
        </div>
      )}

      {tab === "deeds" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {(state.deeds ?? []).length} of {Object.keys(DEEDS).length} deeds earned
          </p>
          <DeedsGrid earned={state.deeds} />
        </div>
      )}

      {tab === "activity" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Star} label="Reflections" value={state.reflections_count ?? 0} color="text-violet-400" />
            <StatCard icon={BookOpen} label="Notes Written" value={state.notes_count ?? 0} color="text-emerald-400" />
            <StatCard icon={Flame} label="Discovers" value={state.discovers_count ?? 0} color="text-orange-400" />
            <StatCard icon={Trophy} label="Challenges" value={state.challenge_date ? 1 : 0} color="text-accent" />
          </div>
          <>
            <ActivityHeatmap events={activityEvents} localByDay={localTrackingByDay} />
            <MinutesTrendChart events={activityEvents} localByDay={localTrackingByDay} />
          </>
          {!activityEnabled && status === "authenticated" && (
            <p className="text-xs text-muted-foreground">
              Cloud activity logging is currently unavailable, so this chart may appear empty.
            </p>
          )}
        </div>
      )}

      {/* Guest upsell */}
      {status !== "authenticated" && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 text-center space-y-3">
          <p className="text-sm text-foreground/80">
            Sign in to sync your progress across devices and never lose your Quran journey.
          </p>
          <Button onClick={() => signIn(QURAN_FOUNDATION_PROVIDER_ID)} className="w-full">
            Sign in with Quran Foundation
          </Button>
        </div>
      )}
    </div>
  );
}
