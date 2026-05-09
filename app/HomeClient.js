"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BookOpen, ChevronRight, Clock, ScrollText, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { pickLatestReadingResume } from "@/lib/continue-reading";
import { dedupeLastHadithByHref, LS_LAST_HADITH_READS } from "@/lib/last-hadith-reads";
import { dedupeLastReadsByHref, LS_QALB_LAST_READS, MAX_QURAN_LAST_READS } from "@/lib/qalb-last-reads";
import { useGamification } from "@/lib/useGamification";
import { ACCOUNT_STORAGE_SYNCED_EVENT, schedulePushReadingHistory } from "@/lib/user-app-sync-bridge";

/** Idle time on home before gentle “continue reading” nudge (ms). */
const HOME_IDLE_NUDGE_MS = 48_000;

const CONTINUE_READ_TOAST_STYLE = {
  background: "oklch(0.18 0.06 155)",
  border: "1px solid oklch(0.68 0.13 155 / 40%)",
  color: "oklch(0.9 0.08 155)",
};

function normalizeTerm(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function saveLastRead(entry) {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_QALB_LAST_READS) ?? "[]");
    const filtered = existing.filter((r) => r.href !== entry.href);
    const updated = dedupeLastReadsByHref(
      [{ ...entry, timestamp: Date.now() }, ...filtered],
      MAX_QURAN_LAST_READS,
    );
    localStorage.setItem(LS_QALB_LAST_READS, JSON.stringify(updated));
    schedulePushReadingHistory();
  } catch {
    /* ignore */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Single surah row */
function SurahRow({ chapter }) {
  const href = `/read?surah=${chapter.id}`;
  return (
    <Link
      href={href}
      onClick={() =>
        saveLastRead({ href, label: chapter.name_simple, sub: chapter.translated_name?.name ?? "", type: "surah" })
      }
      className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl border border-transparent
        hover:bg-card hover:border-border/40 transition-all duration-150 group"
    >
      <div
        className="w-9 h-9 rounded-full border border-accent/30 bg-accent/8 flex items-center
          justify-center shrink-0"
      >
        <span className="text-xs font-semibold text-accent">{chapter.id}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
            {chapter.name_simple}
          </span>
          <span className="text-[10px] text-muted-foreground/50 bg-muted/50 px-2 py-0.5 rounded-full capitalize hidden sm:inline">
            {chapter.revelation_place}
          </span>
        </div>
        <span className="text-xs text-muted-foreground/55">{chapter.translated_name?.name}</span>
      </div>

      <div className="text-right shrink-0">
        <p className="arabic-text arabic-text-tight text-foreground/80 mb-1">{chapter.name_arabic}</p>
        <p className="text-[10px] text-muted-foreground/45">{chapter.verses_count} verses</p>
      </div>

      <ChevronRight
        size={14}
        className="text-muted-foreground/25 group-hover:text-accent/50 transition-colors shrink-0 hidden sm:block"
      />
    </Link>
  );
}

/** Hadith + recent hadith chips + link to library */
function HadithHomeStrip() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    function load() {
      try {
        const raw = JSON.parse(localStorage.getItem(LS_LAST_HADITH_READS) ?? "[]");
        const saved = Array.isArray(raw) ? raw : [];
        const clean = dedupeLastHadithByHref(saved);
        if (JSON.stringify(clean) !== JSON.stringify(saved)) {
          localStorage.setItem(LS_LAST_HADITH_READS, JSON.stringify(clean));
        }
        setItems(clean);
      } catch {
        /* ignore */
      }
    }
    load();
    window.addEventListener("storage", load);
    window.addEventListener("focus", load);
    window.addEventListener("qalb-hadith-reads-changed", load);
    window.addEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("focus", load);
      window.removeEventListener("qalb-hadith-reads-changed", load);
      window.removeEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, load);
    };
  }, []);

  return (
    <div className="mb-5 rounded-2xl border border-border/35 bg-card/20 px-4 py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <ScrollText size={14} className="text-accent/70 shrink-0" aria-hidden />
          <h2 className="text-xs font-semibold text-foreground tracking-wide uppercase">Hadith</h2>
        </div>
        <Link
          href="/ahadith"
          className="text-[11px] font-medium text-accent hover:text-accent/90 inline-flex items-center gap-0.5 shrink-0"
        >
          Browse
          <ChevronRight size={12} aria-hidden />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/80">
          Open any book under Ahadith — your last five sections will appear here.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((r, i) => (
            <Link
              key={`${r.href}#${r.timestamp ?? i}`}
              href={r.href}
              className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border/40 bg-background/30 px-2.5 py-1.5
                text-left hover:border-accent/35 hover:bg-accent/5 transition-colors"
            >
              <span className="text-[11px] font-medium text-foreground truncate">{r.label}</span>
              {r.sub && <span className="text-[10px] text-muted-foreground/60 truncate hidden sm:inline">{r.sub}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ chapters: Array }} props  — server-fetched list of all 114 surahs
 */
export default function HomeClient({ chapters }) {
  const router = useRouter();
  const { award } = useGamification();
  const [search, setSearch] = useState("");
  const [lastReads, setLastReads] = useState([]);
  const continueNudgeShownRef = useRef(false);
  const lastAwardedSearchRef = useRef("");
  const awardRef = useRef(award);
  awardRef.current = award;

  useEffect(() => {
    function loadLastReads() {
      try {
        const raw = JSON.parse(localStorage.getItem(LS_QALB_LAST_READS) ?? "[]");
        const saved = Array.isArray(raw) ? raw : [];
        const clean = dedupeLastReadsByHref(saved, MAX_QURAN_LAST_READS);
        if (JSON.stringify(clean) !== JSON.stringify(saved)) {
          localStorage.setItem(LS_QALB_LAST_READS, JSON.stringify(clean));
        }
        setLastReads(clean);
      } catch {
        /* ignore */
      }
    }
    loadLastReads();
    window.addEventListener("storage", loadLastReads);
    window.addEventListener("focus", loadLastReads);
    window.addEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, loadLastReads);
    return () => {
      window.removeEventListener("storage", loadLastReads);
      window.removeEventListener("focus", loadLastReads);
      window.removeEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, loadLastReads);
    };
  }, []);

  // Gentle nudge after idle on home: resume last Quran or Hadith session (same toast stack as achievements).
  useEffect(() => {
    let idleTimer;

    function tryShowContinueNudge() {
      if (continueNudgeShownRef.current) return;
      try {
        const rawQ = JSON.parse(localStorage.getItem(LS_QALB_LAST_READS) ?? "[]");
        const rawH = JSON.parse(localStorage.getItem(LS_LAST_HADITH_READS) ?? "[]");
        const qList = Array.isArray(rawQ) ? dedupeLastReadsByHref(rawQ, MAX_QURAN_LAST_READS) : [];
        const hList = Array.isArray(rawH) ? dedupeLastHadithByHref(rawH) : [];
        const pick = pickLatestReadingResume(qList, hList);
        if (!pick?.href) return;

        continueNudgeShownRef.current = true;
        const title =
          pick.kind === "quran"
            ? "Continue the Quran"
            : "Continue where you left off";
        const subtitle =
          pick.kind === "quran"
            ? "Pick up your last surah and draw nearer to Allah with every verse."
            : "Return to your last section and keep building understanding.";

        toast(title, {
          description: subtitle,
          duration: 22_000,
          icon: "📖",
          style: CONTINUE_READ_TOAST_STYLE,
          action: {
            label: "Continue reading",
            onClick: () => router.push(pick.href),
          },
        });
      } catch {
        /* ignore */
      }
    }

    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(tryShowContinueNudge, HOME_IDLE_NUDGE_MS);
    }

    resetIdleTimer();
    const opts = { passive: true };
    window.addEventListener("mousedown", resetIdleTimer, opts);
    window.addEventListener("keydown", resetIdleTimer, opts);
    window.addEventListener("touchstart", resetIdleTimer, opts);
    window.addEventListener("scroll", resetIdleTimer, opts);

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener("mousedown", resetIdleTimer);
      window.removeEventListener("keydown", resetIdleTimer);
      window.removeEventListener("touchstart", resetIdleTimer);
      window.removeEventListener("scroll", resetIdleTimer);
    };
  }, [router]);

  const filtered = useMemo(() => {
    const q = normalizeTerm(search);
    if (!q) return chapters;
    const tokens = q.split(" ").filter(Boolean);
    return [...chapters]
      .map((ch) => {
        const nameSimple = normalizeTerm(ch.name_simple);
        const translated = normalizeTerm(ch.translated_name?.name ?? "");
        const arabic = String(ch.name_arabic ?? "").trim();
        const id = String(ch.id);
        let score = 0;
        if (id === q) score += 120;
        if (nameSimple === q || translated === q || arabic === search.trim()) score += 90;
        if (nameSimple.startsWith(q) || translated.startsWith(q)) score += 60;
        if (nameSimple.includes(q) || translated.includes(q)) score += 35;
        if (arabic.includes(search.trim())) score += 50;
        for (const token of tokens) {
          if (token.length < 2) continue;
          if (nameSimple.includes(token)) score += 12;
          if (translated.includes(token)) score += 9;
          if (id.includes(token)) score += 8;
        }
        return { ch, score };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.ch.id - b.ch.id)
      .map((row) => row.ch);
  }, [chapters, search]);

  useEffect(() => {
    const q = normalizeTerm(search);
    if (q.length < 2 || filtered.length === 0) return;
    if (lastAwardedSearchRef.current === q) return;
    lastAwardedSearchRef.current = q;
    awardRef.current("thematic_search", { query: q });
  }, [search, filtered.length]);

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 pb-24 md:pb-8 pt-4">
      <HadithHomeStrip />

      {lastReads.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={13} className="text-accent/70" />
            <span className="text-xs font-medium text-muted-foreground">Recent reading</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lastReads.map((r, i) => (
              <Link
                key={`${r.href}#${r.type ?? "read"}#${r.timestamp ?? i}`}
                href={r.href}
                onClick={() => saveLastRead(r)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/40 bg-card
                  hover:border-accent/40 hover:bg-accent/5 transition-all duration-150 group max-w-full"
              >
                <BookOpen size={13} className="text-accent/60 group-hover:text-accent transition-colors shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors leading-none truncate">
                    {r.label}
                  </p>
                  {r.sub && <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">{r.sub}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/45 pointer-events-none"
        />
        <input
          type="text"
          inputMode="search"
          placeholder="Search surahs by name or number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-8 py-2.5 bg-card border border-border/50 rounded-xl text-sm
            placeholder:text-muted-foreground/35 focus:outline-none focus:border-accent/50 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/45 hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground/70 mb-2">All surahs</p>
      <div className="space-y-0.5">
        {filtered.map((chapter) => (
          <SurahRow key={chapter.id} chapter={chapter} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">No surahs found for &ldquo;{search}&rdquo;</p>
            <button onClick={() => setSearch("")} className="mt-2 text-xs text-accent hover:underline">
              Clear search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
