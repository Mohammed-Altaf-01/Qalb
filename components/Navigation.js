"use client";

import { useEffect, useId, useState } from "react";

import { BookOpen, Compass, Home, LogIn, ScrollText, Settings, User } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getLevelInfo, loadState } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import { QURAN_FOUNDATION_PROVIDER_ID } from "@/lib/constants/auth";

/** Primary routes — keep the header readable; Library & Goals live under Settings. */
const PRIMARY_NAV = [
  { label: "Home", href: "/", icon: Home },
  { label: "Read", href: "/read", icon: BookOpen },
  { label: "Ahadith", href: "/ahadith", icon: ScrollText },
  { label: "Discover", href: "/discover", icon: Compass },
];

function LiveClock() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <div className="h-8 w-[4.25rem] sm:w-auto shrink-0 animate-pulse rounded bg-muted/40" aria-hidden />;

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
    <div
      role="timer"
      aria-label={`Local time ${timeStr}, ${dateStr}`}
      className="flex flex-col items-start leading-tight select-none shrink-0 min-w-0"
    >
      <span className="text-[10px] sm:text-[11px] font-semibold text-foreground/85 tabular-nums tracking-tight">
        {timeStr}
      </span>
      <span className="text-[8px] sm:text-[9px] text-muted-foreground/55 tracking-wide uppercase truncate max-w-[7rem]">
        {dateStr}
      </span>
    </div>
  );
}

function KaabaIcon({ size = 22, className = "" }) {
  const uid = useId();
  const gid = `kaaba-gold-${uid.replace(/:/g, "")}`;

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
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c8a951" />
          <stop offset="50%" stopColor="#e0c275" />
          <stop offset="100%" stopColor="#c8a951" />
        </linearGradient>
      </defs>
      <rect x="3" y="7" width="18" height="14" rx="1.2" stroke={`url(#${gid})`} strokeWidth="1.6" />
      <line x1="3" y1="12" x2="21" y2="12" stroke={`url(#${gid})`} strokeWidth="1.4" />
      <path
        d="M10.5 21 L10.5 16.5 Q10.5 14 12 14 Q13.5 14 13.5 16.5 L13.5 21"
        stroke={`url(#${gid})`}
        strokeWidth="1.4"
      />
      <path d="M3 7 L12 3.5 L21 7" stroke={`url(#${gid})`} strokeWidth="1.4" />
    </svg>
  );
}

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

  if (status === "loading") return <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0" />;

  if (status !== "authenticated") {
    return (
      <button
        onClick={() => signIn(QURAN_FOUNDATION_PROVIDER_ID)}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg px-2.5 py-2 border border-border/40 hover:bg-muted/30 transition-colors shrink-0"
      >
        <LogIn size={16} aria-hidden />
        <span className="hidden sm:inline">Sign in</span>
      </button>
    );
  }

  return (
    <Link
      href="/profile"
      className="flex items-center gap-2 rounded-lg p-1 -m-1 hover:bg-muted/30 transition-colors shrink-0"
      aria-label="Profile"
    >
      <div className="w-9 h-9 rounded-full overflow-hidden border border-border/50 bg-card flex items-center justify-center shrink-0">
        {session.user?.image ? (
          <img src={session.user.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <User size={17} className="text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className={cn("hidden lg:flex flex-col items-start leading-none gap-1 min-w-[4.5rem]")}>
        <span className={cn("text-[10px] font-semibold truncate max-w-[6rem]", levelInfo.current.color)}>
          {levelInfo.current.title}
        </span>
        <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
            style={{ width: `${levelInfo.progress}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

function navIsActive(pathname, href) {
  if (href === "/") return pathname === "/";
  if (href === "/settings") return pathname.startsWith("/settings");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/45 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-5xl flex items-center gap-3 min-h-14 py-2 md:py-0 px-4 md:px-8">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2 shrink-0 transition-opacity hover:opacity-85"
              aria-label="Qalb — home"
            >
              <KaabaIcon size={22} />
              <span className="font-semibold text-base md:text-lg tracking-tight text-gradient-gold hidden sm:inline">
                Qalb
              </span>
            </Link>
            <div className="h-6 sm:h-7 w-px bg-border/45 shrink-0" aria-hidden />
            <LiveClock />
          </div>

          <nav className="hidden md:flex flex-1 justify-center items-center gap-1 min-w-0" aria-label="Primary">
            {PRIMARY_NAV.map(({ label, href, icon: Icon }) => {
              const active = navIsActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors whitespace-nowrap",
                    active
                      ? "text-accent bg-accent/10 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/35",
                  )}
                >
                  <Icon size={16} strokeWidth={active ? 2.35 : 1.75} className="shrink-0" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-1 md:flex-none justify-end items-center gap-1 sm:gap-2 shrink-0">
            <Link
              href="/settings"
              aria-label="Settings"
              aria-current={navIsActive(pathname, "/settings") ? "page" : undefined}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
                navIsActive(pathname, "/settings")
                  ? "text-accent bg-accent/12"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/35",
              )}
            >
              <Settings size={18} strokeWidth={1.75} aria-hidden />
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Mobile tab bar — four flows + profile; settings in header */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border/45 bg-background/92 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        aria-label="Mobile primary"
      >
        <div className="flex items-stretch justify-around h-[3.375rem] max-w-md mx-auto px-1">
          {PRIMARY_NAV.map(({ label, href, icon: Icon }) => {
            const active = navIsActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 rounded-lg transition-colors relative",
                  active ? "text-accent" : "text-muted-foreground active:opacity-80",
                )}
              >
                <Icon size={21} strokeWidth={active ? 2.35 : 1.75} className="shrink-0" aria-hidden />
                <span className="text-[10px] font-medium truncate w-full text-center">{label}</span>
                {active && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-accent/90" />
                )}
              </Link>
            );
          })}
          <Link
            href="/profile"
            aria-label="Profile"
            aria-current={navIsActive(pathname, "/profile") ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 rounded-lg transition-colors relative",
              navIsActive(pathname, "/profile") ? "text-accent" : "text-muted-foreground active:opacity-80",
            )}
          >
            <User size={21} strokeWidth={navIsActive(pathname, "/profile") ? 2.35 : 1.75} aria-hidden />
            <span className="text-[10px] font-medium">Profile</span>
            {navIsActive(pathname, "/profile") && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-accent/90" />
            )}
          </Link>
        </div>
      </nav>
    </>
  );
}
