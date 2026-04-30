"use client";

import { useEffect, useState } from "react";

import { BookMarked, BookOpen, Compass, Home, LogIn, Target, User } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getLevelInfo, loadState } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import { QURAN_FOUNDATION_PROVIDER_ID } from "@/lib/constants/auth";

import ThemeToggle from "./ThemeToggle";

// ─────────────────────────────────────────────────────────────────────────────
// LiveClock
// ─────────────────────────────────────────────────────────────────────────────

function LiveClock() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const timeStr = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col items-start leading-tight select-none">
      <span className="text-[11px] font-semibold text-foreground/85 tabular-nums tracking-tight">{timeStr}</span>
      <span className="text-[9px] text-muted-foreground/55 tracking-wide uppercase">{dateStr}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KaabaIcon
// ─────────────────────────────────────────────────────────────────────────────

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
      <rect x="3" y="7" width="18" height="14" rx="1.2" stroke="url(#kaaba-gold)" strokeWidth="1.6" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="url(#kaaba-gold)" strokeWidth="1.4" />
      <path
        d="M10.5 21 L10.5 16.5 Q10.5 14 12 14 Q13.5 14 13.5 16.5 L13.5 21"
        stroke="url(#kaaba-gold)"
        strokeWidth="1.4"
      />
      <path d="M3 7 L12 3.5 L21 7" stroke="url(#kaaba-gold)" strokeWidth="1.4" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UserButton — avatar + XP mini-bar or sign-in prompt
// ─────────────────────────────────────────────────────────────────────────────

function UserButton() {
  const { data: session, status } = useSession();
  const [xp, setXp] = useState(0);

  useEffect(() => {
    if (status === "loading") return;
    const userId = session?.user?.id ?? "guest";
    const state = loadState(userId);
    setXp(state?.xp ?? 0);
  }, [session, status]);

  const levelInfo = getLevelInfo(xp);

  if (status === "loading") return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;

  if (status !== "authenticated") {
    return (
      <button
        onClick={() => signIn(QURAN_FOUNDATION_PROVIDER_ID)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg px-2 py-1 border border-border/40 hover:border-border"
      >
        <LogIn size={13} />
        <span className="hidden sm:inline">Sign in</span>
      </button>
    );
  }

  return (
    <Link href="/profile" className="flex items-center gap-2 group">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full overflow-hidden border border-border/50 bg-card flex items-center justify-center shrink-0">
        {session.user?.image ? (
          <img src={session.user.image} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <User size={15} className="text-muted-foreground" />
        )}
      </div>
      {/* XP mini pill */}
      <div className={cn("hidden sm:flex flex-col items-start leading-none gap-0.5")}>
        <span className={cn("text-[10px] font-semibold", levelInfo.current.color)}>{levelInfo.current.title}</span>
        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
            style={{ width: `${levelInfo.progress}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Nav items
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Read", href: "/read", icon: BookOpen },
  { label: "Discover", href: "/discover", icon: Compass },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Library", href: "/library", icon: BookMarked },
  { label: "Profile", href: "/profile", icon: User },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Top Header Bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 md:px-8 h-14">
          {/* Logo + clock */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 group transition-opacity duration-200 hover:opacity-70"
              aria-label="Qalb — home"
            >
              <KaabaIcon size={22} className="shrink-0 transition-transform duration-200 group-hover:scale-95" />
              <span className="font-semibold text-lg tracking-tight text-gradient-gold">Qalb</span>
            </Link>
            <div className="h-7 w-px bg-border/50" />
            <LiveClock />
          </div>

          {/* Desktop Nav Links (hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                    isActive
                      ? "text-accent bg-accent/10 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={15} strokeWidth={isActive ? 2.5 : 1.75} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: theme + user */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>

      {/* ── Bottom Mobile Navigation Bar ───────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border/50 bg-background/90 backdrop-blur-md">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 min-w-0",
                  isActive ? "text-accent" : "text-muted-foreground hover:text-foreground hover:opacity-70",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  className={cn("transition-transform duration-200", isActive && "scale-110")}
                />
                <span className="text-[9px] font-medium truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
