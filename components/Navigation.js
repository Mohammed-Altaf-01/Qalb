"use client";

import { useEffect, useId, useState } from "react";

import {
  BookOpen,
  ChevronDown,
  Compass,
  Headphones,
  Home,
  LogIn,
  RadioTower,
  Settings,
  Target,
  User,
} from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import ListenMiniPlayer from "@/components/ListenMiniPlayer";
import PrayerStrip from "@/components/PrayerStrip";
import RadioQuranButton from "@/components/RadioQuranButton";
import { QURAN_FOUNDATION_PROVIDER_ID } from "@/lib/constants/auth";
import { getLevelInfo, loadState } from "@/lib/gamification";
import { warmMakkahLiveStream } from "@/lib/live-stream-warmup";
import { cn } from "@/lib/utils";

/** Primary routes (Home, Read, Discover menus rendered separately). */
const PRIMARY_NAV = [
  { label: "Listen", href: "/listen", icon: Headphones },
  { label: "Live", href: "/live", icon: RadioTower },
];

const READ_MENU_LINKS = [
  { label: "Quran", href: "/read" },
  { label: "Hadith", href: "/ahadith" },
];

const DISCOVER_MENU_LINKS = [
  { label: "Hifz", href: "/hifz" },
  { label: "Khatm", href: "/khatm" },
];

const NUDGE_SESSION_KEY = "qalb_signin_nudge_session_id";
const NUDGE_DISMISSED_KEY = "qalb_signin_nudge_dismissed_session";
const OAUTH_STARTED_KEY = "qalb_oauth_started_at";
const OAUTH_RECOVERED_KEY = "qalb_oauth_recovered_once";

function getSessionNudgeId() {
  let sid = sessionStorage.getItem(NUDGE_SESSION_KEY);
  if (sid) return sid;
  sid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(NUDGE_SESSION_KEY, sid);
  return sid;
}

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
  const [spotlightActive, setSpotlightActive] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    const userId = session?.user?.id ?? "guest";
    const state = loadState(userId);
    setXp(state?.xp ?? 0);
  }, [session, status]);

  const levelInfo = getLevelInfo(xp);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated" || session?.user?.id) {
      setSpotlightActive(false);
      localStorage.removeItem(NUDGE_DISMISSED_KEY);
      sessionStorage.removeItem(OAUTH_STARTED_KEY);
      sessionStorage.removeItem(OAUTH_RECOVERED_KEY);
      return;
    }

    const sessionId = getSessionNudgeId();
    if (localStorage.getItem(NUDGE_DISMISSED_KEY) === sessionId) return;

    const triggerSpotlight = () => {
      setSpotlightActive(true);
      window.setTimeout(() => setSpotlightActive(false), 4200);
    };

    const timers = [
      window.setTimeout(triggerSpotlight, 700),
      window.setTimeout(triggerSpotlight, 5 * 60 * 1000),
      window.setTimeout(triggerSpotlight, 20 * 60 * 1000),
    ];

    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [session?.user?.id, status]);

  useEffect(() => {
    if (status !== "loading") {
      sessionStorage.removeItem(OAUTH_RECOVERED_KEY);
      return;
    }
    const startedAtRaw = sessionStorage.getItem(OAUTH_STARTED_KEY);
    if (!startedAtRaw || sessionStorage.getItem(OAUTH_RECOVERED_KEY) === "1") return;
    const startedAt = Number(startedAtRaw);
    if (!Number.isFinite(startedAt)) return;

    const id = window.setTimeout(
      () => {
        if (sessionStorage.getItem(OAUTH_RECOVERED_KEY) === "1") return;
        sessionStorage.setItem(OAUTH_RECOVERED_KEY, "1");
        window.location.reload();
      },
      Math.max(0, 4500 - (Date.now() - startedAt)),
    );

    return () => window.clearTimeout(id);
  }, [status]);

  if (status === "loading") return <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0" />;

  if (status !== "authenticated") {
    return (
      <>
        <div
          aria-hidden
          className={cn(
            "fixed inset-0 z-40 bg-black/35 pointer-events-none transition-opacity duration-700",
            spotlightActive ? "opacity-100" : "opacity-0",
          )}
        />
        <button
          onClick={() => {
            const sessionId = getSessionNudgeId();
            localStorage.setItem(NUDGE_DISMISSED_KEY, sessionId);
            sessionStorage.setItem(OAUTH_STARTED_KEY, String(Date.now()));
            sessionStorage.removeItem(OAUTH_RECOVERED_KEY);
            signIn(QURAN_FOUNDATION_PROVIDER_ID);
          }}
          className={cn(
            "relative z-50 overflow-hidden text-xs font-medium rounded-lg px-2.5 py-2 border transition-all duration-500 ease-out shrink-0",
            spotlightActive
              ? "text-foreground border-accent/40 bg-background shadow-[0_0_20px_rgba(200,169,81,0.25)] scale-[1.03]"
              : "text-muted-foreground border-border/40 hover:text-foreground hover:bg-muted/30",
          )}
        >
          <svg
            aria-hidden
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            className={cn(
              "pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-700 ease-out",
              spotlightActive ? "opacity-100" : "opacity-0",
            )}
          >
            <rect
              x="1.1"
              y="1.1"
              width="97.8"
              height="37.8"
              rx="8.8"
              fill="none"
              stroke="rgba(200,169,81,0.95)"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeDasharray="30 220"
              filter="drop-shadow(0 0 5px rgba(224,194,117,0.85))"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-250" dur="1.2s" repeatCount="indefinite" />
            </rect>
          </svg>
          <span className="relative z-10 flex items-center gap-2">
            <LogIn size={16} aria-hidden />
            <span className="hidden sm:inline">Sign in</span>
          </span>
        </button>
      </>
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
  if (href === "/listen") return pathname === "/listen";
  if (href === "/live") return pathname === "/live";
  if (href === "/goals") return pathname === "/goals";
  if (href === "/discover") return pathname === "/discover";
  if (href === "/hifz") return pathname.startsWith("/hifz");
  if (href === "/khatm") return pathname.startsWith("/khatm");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isReadNavActive(pathname) {
  return navIsActive(pathname, "/read") || navIsActive(pathname, "/ahadith");
}

function isDiscoverNavActive(pathname) {
  return (
    navIsActive(pathname, "/discover") || navIsActive(pathname, "/hifz") || navIsActive(pathname, "/khatm")
  );
}

/**
 * @param {object} props
 * @param {string} props.label
 * @param {import("lucide-react").LucideIcon} props.icon
 * @param {boolean} props.open
 * @param {() => void} props.onToggle
 * @param {boolean} props.active
 * @param {Array<{ label: string, href: string }>} props.links
 * @param {string} props.pathname
 * @param {() => void} props.onClose
 */
function NavDropMenu({ label, icon: Icon, open, onToggle, active, links, pathname, onClose }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors whitespace-nowrap",
          active
            ? "text-accent bg-accent/10 font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/35",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Icon size={16} aria-hidden />
        {label}
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div
          className="absolute left-1/2 -translate-x-1/2 mt-1 min-w-36 rounded-xl border border-border/50 bg-card/95 shadow-xl p-1.5 z-50"
          role="menu"
        >
          {links.map((link) => {
            const itemActive = navIsActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                role="menuitem"
                aria-current={itemActive ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-3 py-2 text-xs transition-colors",
                  itemActive
                    ? "text-accent bg-accent/12"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/35",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const [readMenuOpen, setReadMenuOpen] = useState(false);
  const [discoverMenuOpen, setDiscoverMenuOpen] = useState(false);

  useEffect(() => {
    setReadMenuOpen(false);
    setDiscoverMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/live")) return;
    const run = () => warmMakkahLiveStream();
    const ric = window.requestIdleCallback;
    if (typeof ric === "function") {
      const id = ric(run, { timeout: 15_000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(run, 10_000);
    return () => clearTimeout(t);
  }, [pathname]);

  function onLiveNavIntent() {
    warmMakkahLiveStream();
  }

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
            <Link
              href="/"
              aria-label="Home"
              aria-current={navIsActive(pathname, "/") ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors whitespace-nowrap",
                navIsActive(pathname, "/")
                  ? "text-accent bg-accent/10 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/35",
              )}
            >
              <Home size={16} strokeWidth={navIsActive(pathname, "/") ? 2.35 : 1.75} className="shrink-0" aria-hidden />
              Home
            </Link>
            <NavDropMenu
              label="Read"
              icon={BookOpen}
              open={readMenuOpen}
              onToggle={() => {
                setDiscoverMenuOpen(false);
                setReadMenuOpen((v) => !v);
              }}
              active={isReadNavActive(pathname)}
              links={READ_MENU_LINKS}
              pathname={pathname}
              onClose={() => setReadMenuOpen(false)}
            />
            <NavDropMenu
              label="Discover"
              icon={Compass}
              open={discoverMenuOpen}
              onToggle={() => {
                setReadMenuOpen(false);
                setDiscoverMenuOpen((v) => !v);
              }}
              active={isDiscoverNavActive(pathname)}
              links={DISCOVER_MENU_LINKS}
              pathname={pathname}
              onClose={() => setDiscoverMenuOpen(false)}
            />
            {PRIMARY_NAV.map(({ label, href, icon: Icon }) => {
              const active = navIsActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onPointerEnter={href === "/live" ? onLiveNavIntent : undefined}
                  onFocus={href === "/live" ? onLiveNavIntent : undefined}
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
            <Link
              href="/goals"
              aria-current={navIsActive(pathname, "/goals") ? "page" : undefined}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors whitespace-nowrap shrink-0",
                navIsActive(pathname, "/goals")
                  ? "text-accent bg-accent/10 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/35",
              )}
            >
              <Target size={14} strokeWidth={navIsActive(pathname, "/goals") ? 2.35 : 1.75} className="shrink-0" aria-hidden />
              Goals
            </Link>
          </nav>

          <div className="flex flex-1 md:flex-none justify-end items-center gap-1 sm:gap-2 shrink-0 min-w-0">
            <RadioQuranButton />
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
        <PrayerStrip />
      </header>

      {/* Mobile tab bar — compact primary flows + profile; settings in header */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border/45 bg-background/92 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        aria-label="Mobile primary"
      >
        <div className="flex items-stretch justify-start h-[3.375rem] max-w-full mx-auto px-1 gap-0 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            href="/"
            aria-label="Home"
            aria-current={navIsActive(pathname, "/") ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-[3.35rem] shrink-0 flex-1 py-1 rounded-lg transition-colors relative",
              navIsActive(pathname, "/") ? "text-accent" : "text-muted-foreground active:opacity-80",
            )}
          >
            <Home size={21} strokeWidth={navIsActive(pathname, "/") ? 2.35 : 1.75} aria-hidden />
            <span className="text-[10px] font-medium">Home</span>
            {navIsActive(pathname, "/") && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-accent/90" />
            )}
          </Link>
          <Link
            href="/read"
            aria-label="Read"
            aria-current={isReadNavActive(pathname) ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-[3.35rem] shrink-0 flex-1 py-1 rounded-lg transition-colors relative",
              isReadNavActive(pathname) ? "text-accent" : "text-muted-foreground active:opacity-80",
            )}
          >
            <BookOpen size={21} strokeWidth={isReadNavActive(pathname) ? 2.35 : 1.75} aria-hidden />
            <span className="text-[10px] font-medium">Read</span>
            {isReadNavActive(pathname) && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-accent/90" />
            )}
          </Link>
          <Link
            href="/discover"
            aria-label="Discover"
            aria-current={isDiscoverNavActive(pathname) ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-[3.35rem] shrink-0 flex-1 py-1 rounded-lg transition-colors relative",
              isDiscoverNavActive(pathname) ? "text-accent" : "text-muted-foreground active:opacity-80",
            )}
          >
            <Compass size={21} strokeWidth={isDiscoverNavActive(pathname) ? 2.35 : 1.75} aria-hidden />
            <span className="text-[10px] font-medium">Discover</span>
            {isDiscoverNavActive(pathname) && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-accent/90" />
            )}
          </Link>
          {PRIMARY_NAV.map(({ label, href, icon: Icon }) => {
            const active = navIsActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onPointerEnter={href === "/live" ? onLiveNavIntent : undefined}
                onFocus={href === "/live" ? onLiveNavIntent : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 min-w-[3.35rem] shrink-0 flex-1 py-1 rounded-lg transition-colors relative",
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
            href="/goals"
            aria-label="Goals"
            aria-current={navIsActive(pathname, "/goals") ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-[3rem] shrink-0 flex-1 py-1 rounded-lg transition-colors relative",
              navIsActive(pathname, "/goals") ? "text-accent" : "text-muted-foreground active:opacity-80",
            )}
          >
            <Target size={19} strokeWidth={navIsActive(pathname, "/goals") ? 2.35 : 1.75} aria-hidden />
            <span className="text-[9px] font-medium">Goals</span>
            {navIsActive(pathname, "/goals") && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-accent/90" />
            )}
          </Link>
          <Link
            href="/profile"
            aria-label="Profile"
            aria-current={navIsActive(pathname, "/profile") ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-[3.35rem] shrink-0 flex-1 py-1 rounded-lg transition-colors relative",
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
      <ListenMiniPlayer />
    </>
  );
}
