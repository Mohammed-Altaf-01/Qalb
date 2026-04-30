"use client";

import { useEffect, useState } from "react";

import { Award, BookOpen, Flame, LogIn, LogOut, Star, Target, Trophy, User, Zap } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { BADGES, DEEDS, LEVELS, getDailyChallenge, getLevelInfo } from "@/lib/gamification";
import { QURAN_FOUNDATION_PROVIDER_ID } from "@/lib/constants/auth";
import { useGamification } from "@/lib/useGamification";
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

// ─────────────────────────────────────────────────────────────────────────────
// Main profile page
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { state } = useGamification();
  const router = useRouter();
  const [tab, setTab] = useState("overview");

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "levels", label: "Levels" },
    { id: "badges", label: "Badges" },
    { id: "deeds", label: "Deeds" },
    { id: "activity", label: "Activity" },
  ];

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

      {/* Daily challenge */}
      <DailyChallenge state={state} />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted/30 p-1 border border-border/30">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 py-2 text-xs font-medium rounded-lg transition-all",
              tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
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
