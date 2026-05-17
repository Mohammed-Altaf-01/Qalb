"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import {
  BookOpen,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Layers,
  LayoutList,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  Rows3,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { filterVerseWords, stripVerseEndMarker, toArabicIndicDigits, verseNumberFromKey } from "@/lib/arabic-utils";
import { fetchWithRetry } from "@/lib/client-fetch-retry";
import { firstMushafPageForJuz, lastMushafPageForJuz } from "@/lib/juz-mushaf-start-page";
import { markKhatmPage } from "@/lib/khatm-progress";
import { emitJourneyLocalUpdated } from "@/lib/qalb-journey-events";
import { LS_QALB_LAST_READS, touchReadingProgress } from "@/lib/qalb-last-reads";
import { LS_READING_PROGRESS_KEY, LS_READ_KEY_THEMES } from "@/lib/qalb-storage-keys";
import { paginationHasNextPage } from "@/lib/read-pagination";
import { READ_RECITERS } from "@/lib/read-reciters";
import { cleanTranslationText } from "@/lib/translation-utils";
import { useGamification } from "@/lib/useGamification";
import {
  schedulePushLibraryBookmarks,
  schedulePushPreferences,
  schedulePushReadKeyThemes,
  schedulePushReadingHistory,
  schedulePushReadingProgress,
} from "@/lib/user-app-sync-bridge";
import { cn } from "@/lib/utils";
import { minVerseKeyFromMapping } from "@/lib/verse-key-compare";

// ─────────────────────────────────────────────────────────────────────────────
// Translation catalogue
// ─────────────────────────────────────────────────────────────────────────────

export const TRANSLATIONS = [
  { id: 20, name: "Saheeh International", language: "English" },
  { id: 85, name: "M.A.S. Abdel Haleem", language: "English" },
  { id: 19, name: "M. Pickthall", language: "English" },
  { id: 22, name: "A. Yusuf Ali", language: "English" },
  { id: 84, name: "Mufti Taqi Usmani", language: "English" },
  { id: 54, name: "Muhammad Junagarhi", language: "Urdu" },
  { id: 234, name: "Fatah Muhammad Jalandhari", language: "Urdu" },
  { id: 97, name: "Abul A'la Maududi", language: "Urdu" },
  { id: 162, name: "Bayaan Foundation", language: "Bengali" },
  { id: 31, name: "Muhammad Hamidullah", language: "French" },
  { id: 52, name: "Elmalili Hamdi Yazir", language: "Turkish" },
  { id: 33, name: "Indonesian (Ministry)", language: "Indonesian" },
];

const DEFAULT_TRANSLATION_ID = 20;
const BATCH_SIZE = 20;
const LS_KEY = LS_READING_PROGRESS_KEY;

// Juz start positions — key: "surahId:verseNum" → juz number
const JUZ_STARTS = new Map([
  ["1:1", 1],
  ["2:142", 2],
  ["2:253", 3],
  ["3:93", 4],
  ["4:24", 5],
  ["4:148", 6],
  ["5:83", 7],
  ["6:111", 8],
  ["7:88", 9],
  ["8:41", 10],
  ["9:93", 11],
  ["11:6", 12],
  ["12:53", 13],
  ["15:1", 14],
  ["17:1", 15],
  ["18:75", 16],
  ["21:1", 17],
  ["23:1", 18],
  ["25:21", 19],
  ["27:56", 20],
  ["29:46", 21],
  ["33:31", 22],
  ["36:28", 23],
  ["39:32", 24],
  ["41:47", 25],
  ["46:1", 26],
  ["51:31", 27],
  ["58:1", 28],
  ["67:1", 29],
  ["78:1", 30],
]);

// Hizb start positions — key: "surahId:verseNum" → hizb number
const HIZB_STARTS = new Map([
  ["1:1", 1],
  ["2:75", 2],
  ["2:142", 3],
  ["2:204", 4],
  ["2:253", 5],
  ["3:15", 6],
  ["3:93", 7],
  ["3:171", 8],
  ["4:24", 9],
  ["4:88", 10],
  ["4:148", 11],
  ["5:1", 12],
  ["5:83", 13],
  ["6:1", 14],
  ["6:111", 15],
  ["7:1", 16],
  ["7:88", 17],
  ["7:171", 18],
  ["8:41", 19],
  ["9:33", 20],
  ["9:93", 21],
  ["10:26", 22],
  ["11:6", 23],
  ["11:84", 24],
  ["12:53", 25],
  ["13:18", 26],
  ["15:1", 27],
  ["16:50", 28],
  ["17:1", 29],
  ["17:99", 30],
  ["18:75", 31],
  ["19:58", 32],
  ["21:1", 33],
  ["22:1", 34],
  ["23:1", 35],
  ["24:21", 36],
  ["25:21", 37],
  ["26:111", 38],
  ["27:56", 39],
  ["28:51", 40],
  ["29:46", 41],
  ["31:22", 42],
  ["33:31", 43],
  ["34:24", 44],
  ["36:28", 45],
  ["37:145", 46],
  ["39:32", 47],
  ["40:41", 48],
  ["41:47", 49],
  ["43:24", 50],
  ["46:1", 51],
  ["48:17", 52],
  ["51:31", 53],
  ["54:1", 54],
  ["58:1", 55],
  ["61:1", 56],
  ["67:1", 57],
  ["71:1", 58],
  ["78:1", 59],
  ["91:1", 60],
]);

// ─────────────────────────────────────────────────────────────────────────────
// Ayah marker + VersePlayer — full-line Arabic (legible joins) + verse audio
// ─────────────────────────────────────────────────────────────────────────────

const LS_BOOKMARKS_READ = "qalb_bookmarks";

function AyahEndBadge({ verseKey, compact }) {
  const n = verseNumberFromKey(verseKey);
  if (n == null) return null;
  const digits = toArabicIndicDigits(n);
  return (
    <span
      className={cn("ayah-end-badge", compact && "ayah-end-badge--compact")}
      aria-label={`Ayah ${n}`}
      title={`Ayah ${n}`}
    >
      {digits}
    </span>
  );
}

function findActiveWord(currentMs, segments) {
  if (!segments?.length) return -1;
  for (const seg of segments) {
    const wordPos = seg[1];
    const startMs = seg[2];
    const endMs = seg[3];
    if (currentMs >= startMs && currentMs < endMs) return wordPos - 1;
  }
  return -1;
}

function VersePlayer({ verse, reciterId, playingKey, setPlayingKey, isHighlighted, chapterName }) {
  const { award } = useGamification();
  const awardRef = useRef(award);
  awardRef.current = award;
  const verseKey = verse.verse_key ?? "";
  const words = filterVerseWords(verse.words);
  const body = stripVerseEndMarker(verse.text_uthmani ?? "");
  const translation = cleanTranslationText(verse.translations?.[0]?.text?.replace(/<[^>]*>/g, "") ?? "");

  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [segments, setSegments] = useState(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [activeWordIdx, setActiveWordIdx] = useState(-1);
  const [audioError, setAudioError] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const isPlaying = playingKey === verseKey;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_BOOKMARKS_READ);
      const o = raw ? JSON.parse(raw) : {};
      setIsBookmarked(!!(o && typeof o === "object" && o[verseKey]));
    } catch {
      setIsBookmarked(false);
    }
  }, [verseKey]);

  // Reset cached audio when reciter changes
  useEffect(() => {
    setAudioUrl(null);
    setSegments(null);
    setAudioError(false);
    setActiveWordIdx(-1);
    if (playingKey === verseKey) setPlayingKey(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reciterId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (!isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      setActiveWordIdx(-1);
      return;
    }

    let cancelled = false;

    const tryPlay = () => {
      if (cancelled || !audioRef.current) return;
      audioRef.current.play().catch(() => {
        if (cancelled) return;
        const el = audioRef.current;
        if (!el) return;
        const once = () => {
          el.removeEventListener("canplay", once);
          el.removeEventListener("loadeddata", once);
          if (cancelled) return;
          el.play().catch(() => {
            if (!cancelled) setAudioError(true);
          });
        };
        el.addEventListener("canplay", once, { once: true });
        el.addEventListener("loadeddata", once, { once: true });
      });
    };

    if (audio.readyState >= 2) tryPlay();
    else audio.addEventListener("canplay", tryPlay, { once: true });

    return () => {
      cancelled = true;
    };
  }, [isPlaying, audioUrl]);

  async function handlePlay() {
    if (isLoadingAudio) return;

    if (!audioUrl && !audioError) {
      setIsLoadingAudio(true);
      try {
        const useSegments = words.length > 0;
        const res = await fetch(
          `/api/verse/audio?key=${encodeURIComponent(verseKey)}&reciter=${reciterId}&segments=${useSegments}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.audioUrl) throw new Error("no url");
        setAudioUrl(data.audioUrl);
        setSegments(data.segments ?? null);
        setAudioError(false);
      } catch {
        setAudioError(true);
        return;
      } finally {
        setIsLoadingAudio(false);
      }
    }

    setPlayingKey(isPlaying ? null : verseKey);
  }

  const handleEnded = useCallback(() => {
    setPlayingKey(null);
    setActiveWordIdx(-1);
  }, [setPlayingKey]);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current || !segments?.length) return;
    const ms = audioRef.current.currentTime * 1000;
    setActiveWordIdx(findActiveWord(ms, segments));
  }, [segments]);

  const toggleBookmark = useCallback(() => {
    try {
      const raw = localStorage.getItem(LS_BOOKMARKS_READ) ?? "{}";
      const stored = JSON.parse(raw);
      const next = typeof stored === "object" && stored && !Array.isArray(stored) ? { ...stored } : {};
      if (next[verseKey]) {
        delete next[verseKey];
        localStorage.setItem(LS_BOOKMARKS_READ, JSON.stringify(next));
        schedulePushLibraryBookmarks();
        setIsBookmarked(false);
      } else {
        next[verseKey] = {
          verseKey,
          chapterName: chapterName || verseKey.split(":")[0],
          arabicText: body,
          translation: translation || "",
          bookmarkedAt: new Date().toISOString(),
        };
        localStorage.setItem(LS_BOOKMARKS_READ, JSON.stringify(next));
        schedulePushLibraryBookmarks();
        setIsBookmarked(true);
        awardRef.current("bookmark_verse");
      }
    } catch {
      /* ignore */
    }
  }, [verseKey, chapterName, body, translation]);

  const juzNum = JUZ_STARTS.get(verseKey);
  const hizbNum = HIZB_STARTS.get(verseKey);
  const hasMarker = juzNum != null || hizbNum != null;

  return (
    <div
      id={`verse-${verseKey}`}
      className={cn(
        "py-7 border-b border-border/20 last:border-0 group/verse transition-colors duration-700",
        isHighlighted && "bg-accent/5 rounded-2xl border border-accent/20",
        isPlaying && "ring-1 ring-accent/15 ring-inset",
      )}
    >
      {hasMarker && (
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="flex-1 h-px bg-accent/20" />
          <div className="flex items-center gap-1.5">
            {juzNum != null && (
              <span className="text-[10px] font-semibold text-accent bg-accent/12 border border-accent/25 rounded-full px-2.5 py-0.5">
                Juz {juzNum}
              </span>
            )}
            {hizbNum != null && (
              <span className="text-[10px] font-semibold text-accent/70 bg-accent/8 border border-accent/15 rounded-full px-2.5 py-0.5">
                Hizb {hizbNum}
              </span>
            )}
          </div>
          <div className="flex-1 h-px bg-accent/20" />
        </div>
      )}

      <div className="flex justify-center mb-4">
        <span className="text-[10px] text-muted-foreground/70 font-mono tabular-nums tracking-wide">{verseKey}</span>
      </div>

      <div className="mb-5 px-1 md:px-3">
        <div className="mx-auto max-w-[min(100%,42rem)]" dir="rtl" lang="ar">
          {words.length > 0 ? (
            <p className="read-quran-arabic text-start">
              {words.map((word, i) => (
                <span
                  key={word.id ?? i}
                  className={cn(
                    "inline rounded px-[0.08em] transition-colors duration-100",
                    activeWordIdx === (word.position ?? i + 1) - 1 && "bg-accent/20 text-accent",
                  )}
                >
                  {word.text_uthmani}
                  {i < words.length - 1 ? " " : ""}
                </span>
              ))}
              <AyahEndBadge verseKey={verseKey} />
            </p>
          ) : (
            <p className="read-quran-arabic text-start">
              <span>{body}</span>
              <AyahEndBadge verseKey={verseKey} />
            </p>
          )}
        </div>
      </div>

      {translation && (
        <p className="reading-prose text-foreground/70 text-center max-w-2xl mx-auto px-4 mb-4 leading-relaxed">
          {translation}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-2">
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={() => {
              setAudioError(true);
              setPlayingKey(null);
            }}
          />
        )}

        {audioError ? (
          <span className="text-[10px] text-muted-foreground/40">Audio unavailable</span>
        ) : (
          <button
            type="button"
            onClick={handlePlay}
            disabled={isLoadingAudio}
            aria-label={isPlaying ? "Pause" : "Play recitation"}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all duration-150",
              isPlaying
                ? "border-accent/60 bg-accent/15 text-accent"
                : "border-border/40 bg-muted/30 text-muted-foreground hover:border-accent/40 hover:text-accent",
            )}
          >
            {isLoadingAudio ? (
              <Loader2 size={12} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={12} />
            ) : (
              <Volume2 size={12} />
            )}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={toggleBookmark}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this verse"}
          className={cn(
            "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all duration-150",
            isBookmarked
              ? "border-accent/50 bg-accent/12 text-accent"
              : "border-border/40 bg-muted/30 text-muted-foreground hover:border-accent/40 hover:text-accent",
          )}
        >
          <Bookmark size={12} className={isBookmarked ? "fill-current" : ""} aria-hidden />
          <span>{isBookmarked ? "Saved" : "Bookmark"}</span>
        </button>

        {verseKey ? (
          <Link
            href={`/verse/${verseKey}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/45
              hover:text-accent transition-colors duration-150 group/reflect"
          >
            <MessageCircle size={12} className="group-hover/reflect:text-accent transition-colors" />
            <span>Reflect &amp; Chat</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SummaryPanel — AI themes/summary for all loaded verses
// ─────────────────────────────────────────────────────────────────────────────

function persistReadKeyThemesToLocal(surahId, surahName, markdown) {
  if (surahId == null || typeof markdown !== "string") return;
  try {
    const raw = localStorage.getItem(LS_READ_KEY_THEMES) ?? "{}";
    const doc = JSON.parse(raw);
    const themesBySurahId =
      doc && typeof doc === "object" && doc.themesBySurahId && typeof doc.themesBySurahId === "object"
        ? doc.themesBySurahId
        : {};
    themesBySurahId[String(surahId)] = {
      markdown,
      updatedAt: Date.now(),
      surahName: typeof surahName === "string" ? surahName : "",
    };
    localStorage.setItem(LS_READ_KEY_THEMES, JSON.stringify({ themesBySurahId, updatedAt: Date.now() }));
    schedulePushReadKeyThemes();
    emitJourneyLocalUpdated();
  } catch {
    /* ignore */
  }
}

function SummaryPanel({ verses, surahId, surahName, onClose }) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const openedForSurahRef = useRef(null);

  const runStream = useCallback(() => {
    if (!verses?.length) return;

    const versesPayload = verses.slice(0, 60).map((v) => ({
      verseKey: v.verse_key,
      arabic: v.text_uthmani ?? "",
      translation: v.translations?.[0]?.text?.replace(/<[^>]*>/g, "") ?? "",
    }));

    setStreaming(true);
    setText("");
    setDone(false);
    setFromCache(false);

    fetch("/api/ai/read-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surahName,
        pageNumber: 1,
        verses: versesPayload,
        priorSummary: "",
      }),
    })
      .then(async (res) => {
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        while (true) {
          const { done: d, value } = await reader.read();
          if (d) break;
          full += decoder.decode(value, { stream: true });
          setText(full);
        }
        setDone(true);
        persistReadKeyThemesToLocal(surahId, surahName, full);
      })
      .catch(() => {
        setText("Could not generate summary. Please try again.");
        setDone(true);
      })
      .finally(() => setStreaming(false));
  }, [verses, surahId, surahName]);

  useEffect(() => {
    if (!verses?.length || surahId == null) return;
    if (openedForSurahRef.current === surahId) return;
    openedForSurahRef.current = surahId;

    let hadCache = false;
    try {
      const doc = JSON.parse(localStorage.getItem(LS_READ_KEY_THEMES) ?? "{}");
      const row = doc?.themesBySurahId?.[String(surahId)];
      if (typeof row?.markdown === "string" && row.markdown.length > 0) {
        setText(row.markdown);
        setDone(true);
        setFromCache(true);
        hadCache = true;
      }
    } catch {
      /* ignore */
    }

    if (!hadCache) runStream();
  }, [surahId, verses.length, runStream]);

  return (
    <div
      className="fixed inset-x-4 bottom-20 md:bottom-6 md:inset-x-auto md:right-6 md:left-auto md:w-[420px]
      z-50 rounded-2xl border border-accent/25 bg-card shadow-2xl shadow-black/30 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-accent/5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={14} className="text-accent shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate">Key Themes — {surahName}</span>
          {streaming && <Loader2 size={11} className="animate-spin text-accent/60 shrink-0" />}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(fromCache || done) && !streaming && (
            <button
              type="button"
              onClick={() => runStream()}
              className="text-[10px] font-medium text-accent hover:text-accent/90 px-2 py-1 rounded-md border border-accent/30"
            >
              Refresh
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground/60 hover:text-foreground transition-colors p-1"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4 max-h-64 overflow-y-auto text-sm leading-relaxed text-foreground/80">
        {text ? (
          <div className="chat-markdown break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            {streaming && <span className="inline-block w-0.5 h-3.5 bg-accent/70 ml-0.5 align-middle animate-pulse" />}
          </div>
        ) : (
          <span className="text-muted-foreground/50 text-xs">Generating…</span>
        )}
      </div>
    </div>
  );
}

/** @param {object | null} jrec Raw juz row from Quran Foundation `/juzs` list */
function firstVerseKeyFromJuzApiRecord(jrec) {
  if (!jrec || typeof jrec !== "object") return null;
  if (typeof jrec.first_verse_key === "string") return jrec.first_verse_key;
  return minVerseKeyFromMapping(jrec.verse_mapping ?? jrec.verses_mapping);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ReadClient({
  chapters,
  initialSurahId,
  initialStartVerse = 1,
  initialLayout = null,
  initialMushafPage = null,
}) {
  const router = useRouter();
  const { award } = useGamification();

  // ── View ─────────────────────────────────────────────────────────────────
  const [view, setView] = useState("picker");

  // ── Chapter / settings ──────────────────────────────────────────────────
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [translationId, setTranslationId] = useState(DEFAULT_TRANSLATION_ID);
  const [reciterId, setReciterId] = useState(() => {
    if (typeof window === "undefined") return 7;
    const saved = parseInt(localStorage.getItem("qalb_reciter_id") ?? "0", 10);
    return READ_RECITERS.some((r) => r.id === saved) ? saved : 7;
  });
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);
  const [showReciterPicker, setShowReciterPicker] = useState(false);

  // ── Verses (infinite scroll) ─────────────────────────────────────────────
  const [verses, setVerses] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Use refs so the IntersectionObserver callback reads current values
  const currentPageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const isLoadingRef = useRef(false);
  /** Bumped on surah/translation change so stale fetches never block UI or drop loading state. */
  const versesSessionRef = useRef(0);
  const selectedChapterRef = useRef(null);
  const translationIdRef = useRef(DEFAULT_TRANSLATION_ID);
  const versePageByKeyRef = useRef(new Map());

  useEffect(() => {
    const map = new Map();
    for (const v of verses) {
      const k = v?.verse_key;
      const p = Number(v?.page_number);
      if (typeof k === "string" && k && Number.isFinite(p) && p >= 1 && p <= 604) {
        map.set(k, Math.floor(p));
      }
    }
    versePageByKeyRef.current = map;
  }, [verses]);

  // ── Audio ────────────────────────────────────────────────────────────────
  const [playingKey, setPlayingKey] = useState(null);

  // ── Highlight ────────────────────────────────────────────────────────────
  const [highlightVerseKey, setHighlightVerseKey] = useState(null);

  // ── Summary ──────────────────────────────────────────────────────────────
  const [showSummary, setShowSummary] = useState(false);

  /** `verses` — per-ayah layout + translation + audio. `mushaf` — continuous Arabic flow (quran.com-style). `juz` — mushaf constrained to one juz. */
  const [readingLayout, setReadingLayout] = useState("verses");
  /** When set, `readingLayout === "juz"` only loads/navigates pages inside this mushaf span. */
  const [juzReadContext, setJuzReadContext] = useState(null);
  const [pickerTab, setPickerTab] = useState("surah");
  const [mushafPage, setMushafPage] = useState(1);
  const [mushafVerses, setMushafVerses] = useState([]);
  const [isLoadingMushaf, setIsLoadingMushaf] = useState(false);
  const [mushafHasNext, setMushafHasNext] = useState(false);
  const mushafAudioRef = useRef(null);
  const [mushafPlayingIndex, setMushafPlayingIndex] = useState(-1);
  const [isMushafPagePlaying, setIsMushafPagePlaying] = useState(false);
  const [mushafAudioUrl, setMushafAudioUrl] = useState(null);
  const [isMushafAudioLoading, setIsMushafAudioLoading] = useState(false);

  // ── Sentinel for infinite scroll ─────────────────────────────────────────
  const sentinelRef = useRef(null);
  const loadMoreBackoffUntilRef = useRef(0);
  const loadMoreRateToastAtRef = useRef(0);

  // ── Target verse to scroll to after initial load ─────────────────────────
  const targetVerseRef = useRef(null);
  const lastAwardedReadRef = useRef(null);

  // ── Load more verses ──────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreRef.current || !selectedChapterRef.current) return;
    if (Date.now() < loadMoreBackoffUntilRef.current) return;

    const session = versesSessionRef.current;
    const chapterId = selectedChapterRef.current.id;

    isLoadingRef.current = true;
    setIsLoadingMore(true);

    const page = currentPageRef.current;
    const chapter = selectedChapterRef.current;
    const translation = translationIdRef.current;

    try {
      const res = await fetchWithRetry(
        `/api/verse/by-chapter?surah=${chapter.id}&page=${page}&perPage=${BATCH_SIZE}&translation=${translation}`,
      );
      if (!res.ok) {
        if (res.status === 429) {
          loadMoreBackoffUntilRef.current = Date.now() + 8000;
          if (Date.now() - loadMoreRateToastAtRef.current > 12_000) {
            loadMoreRateToastAtRef.current = Date.now();
            toast.message("Loading paused briefly — fetching more ayat…", { duration: 4000 });
          }
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      if (session !== versesSessionRef.current || selectedChapterRef.current?.id !== chapterId) {
        return;
      }

      const newVerses = data.verses ?? [];
      if (newVerses.length === 0) {
        hasMoreRef.current = false;
        setHasMore(false);
      }

      setVerses((prev) => {
        const seen = new Set(prev.map((v) => v.verse_key));
        return [...prev, ...newVerses.filter((v) => !seen.has(v.verse_key))];
      });

      const pagination = data.pagination ?? {};
      const more = paginationHasNextPage(pagination, page, BATCH_SIZE, newVerses.length);
      if (more) {
        currentPageRef.current = page + 1;
      } else {
        hasMoreRef.current = false;
        setHasMore(false);
      }
    } catch (err) {
      console.error("[ReadClient] loadMore:", err);
    } finally {
      if (session === versesSessionRef.current && selectedChapterRef.current?.id === chapterId) {
        isLoadingRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    if (view !== "reading" || (readingLayout !== "mushaf" && readingLayout !== "juz")) return;
    let cancelled = false;
    async function loadMushafPage() {
      setIsLoadingMushaf(true);
      try {
        const res = await fetchWithRetry(`/api/verse/by-page?page=${mushafPage}&translation=${translationId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const nextVerses = Array.isArray(data?.verses) ? data.verses : [];
        setMushafVerses(nextVerses);
        const jMax = readingLayout === "juz" && juzReadContext ? juzReadContext.lastPage : 604;
        setMushafHasNext(mushafPage < jMax && nextVerses.length > 0);
      } catch (err) {
        if (!cancelled) {
          console.error("[ReadClient] loadMushafPage:", err);
          setMushafVerses([]);
          setMushafHasNext(false);
        }
      } finally {
        if (!cancelled) setIsLoadingMushaf(false);
      }
    }
    loadMushafPage();
    return () => {
      cancelled = true;
    };
  }, [view, readingLayout, juzReadContext, mushafPage, translationId]);

  useEffect(() => {
    // Reset page playback when context changes.
    setMushafPlayingIndex(-1);
    setIsMushafPagePlaying(false);
    setMushafAudioUrl(null);
  }, [mushafPage, reciterId, readingLayout, juzReadContext, view]);

  useEffect(() => {
    if (!isMushafPagePlaying) return;
    if (mushafPlayingIndex < 0 || mushafPlayingIndex >= mushafVerses.length) return;
    const current = mushafVerses[mushafPlayingIndex];
    if (!current?.verse_key) return;
    let cancelled = false;
    async function loadCurrentAudio() {
      setIsMushafAudioLoading(true);
      try {
        const res = await fetch(`/api/verse/audio?key=${encodeURIComponent(current.verse_key)}&reciter=${reciterId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setMushafAudioUrl(data?.audioUrl ?? null);
      } catch {
        if (!cancelled) {
          setMushafAudioUrl(null);
          setIsMushafPagePlaying(false);
        }
      } finally {
        if (!cancelled) setIsMushafAudioLoading(false);
      }
    }
    loadCurrentAudio();
    return () => {
      cancelled = true;
    };
  }, [isMushafPagePlaying, mushafPlayingIndex, mushafVerses, reciterId]);

  useEffect(() => {
    if (!isMushafPagePlaying || !mushafAudioUrl || !mushafAudioRef.current) return;
    mushafAudioRef.current.play().catch(() => {});
  }, [isMushafPagePlaying, mushafAudioUrl]);

  const toggleMushafPagePlayback = useCallback(() => {
    if (!mushafVerses.length) return;
    if (isMushafPagePlaying) {
      mushafAudioRef.current?.pause();
      setIsMushafPagePlaying(false);
      return;
    }
    setMushafPlayingIndex((idx) => (idx >= 0 ? idx : 0));
    setIsMushafPagePlaying(true);
  }, [isMushafPagePlaying, mushafVerses.length]);

  // ── Intersection Observer — triggers loadMore when sentinel enters view ──
  useEffect(() => {
    if (view !== "reading" || readingLayout !== "verses") return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Skip if already loading — prevents double-fire on initial mount
        if (entries[0].isIntersecting && !isLoadingRef.current && Date.now() >= loadMoreBackoffUntilRef.current) {
          loadMore();
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [view, readingLayout, loadMore]);

  // ── Mark khatm page when reading mushaf ─────────────────────────────────
  useEffect(() => {
    if (view !== "reading") return;
    if (readingLayout !== "mushaf" && readingLayout !== "juz") return;
    markKhatmPage(mushafPage);
  }, [view, readingLayout, mushafPage]);

  // ── Restore last position / handle initialSurahId ────────────────────────
  useEffect(() => {
    if (!chapters?.length) return;

    if (initialLayout === "mushaf" && initialMushafPage) {
      const page = Math.min(604, Math.max(1, initialMushafPage));
      const chapter = chapters[0];
      if (chapter) {
        setSelectedChapter(chapter);
        setView("reading");
        setReadingLayout("mushaf");
        setMushafPage(page);
      }
      return;
    }

    if (initialSurahId) {
      const chapter = chapters.find((c) => c.id === initialSurahId);
      if (chapter) {
        startReading(chapter, initialStartVerse ?? 1);
        return;
      }
    }

    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? "null");
      if (saved?.surahId) {
        const chapter = chapters.find((c) => c.id === saved.surahId);
        if (chapter) {
          if (saved.translationId) {
            translationIdRef.current = saved.translationId;
            setTranslationId(saved.translationId);
          }
          startReading(chapter, saved.verseNum ?? 1);
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters, initialSurahId, initialLayout, initialMushafPage]);

  // ── Save progress + track last-read verse while scrolling ────────────────
  useEffect(() => {
    if (!selectedChapter) return;
    try {
      const payload = {
        surahId: selectedChapter.id,
        translationId,
        updatedAt: Date.now(),
      };
      if (readingLayout === "mushaf" || readingLayout === "juz") {
        payload.readingLayout = readingLayout;
        payload.mushafPage = mushafPage;
      }
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
      schedulePushReadingProgress();
    } catch {
      /* quota exceeded */
    }
  }, [selectedChapter, translationId, readingLayout, mushafPage]);

  useEffect(() => {
    if (view !== "reading" || !selectedChapter) return;

    const lastSeenRef = { current: null };

    function updateLastRead() {
      const verseEls = document.querySelectorAll('[id^="verse-"]');
      if (!verseEls.length) return;

      const viewportMid = window.scrollY + window.innerHeight / 2;
      let closest = null;
      let closestDist = Infinity;

      for (const el of verseEls) {
        const top = el.getBoundingClientRect().top + window.scrollY;
        const dist = Math.abs(top + el.offsetHeight / 2 - viewportMid);
        if (dist < closestDist) {
          closestDist = dist;
          closest = el;
        }
      }

      if (!closest) return;
      const verseKey = closest.id.replace("verse-", "");
      if (verseKey === lastSeenRef.current) return;
      lastSeenRef.current = verseKey;

      const verseNum = parseInt(verseKey.split(":")[1], 10);
      if (!verseNum) return;

      if (readingLayout === "verses") {
        const pageNum = versePageByKeyRef.current.get(verseKey);
        if (pageNum) markKhatmPage(pageNum);
      }

      // Persist last-read verse so the picker can restore it
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({
            surahId: selectedChapter.id,
            verseNum,
            translationId,
            updatedAt: Date.now(),
          }),
        );
        schedulePushReadingProgress();
      } catch {
        /* ignore */
      }

      // Home “Recent reading” strip — one entry per surah, newest-first (max 5)
      try {
        const reads = JSON.parse(localStorage.getItem(LS_QALB_LAST_READS) ?? "[]");
        const list = Array.isArray(reads) ? reads : [];
        const updated = touchReadingProgress(list, {
          chapterId: selectedChapter.id,
          verseNum,
          chapterName: selectedChapter.name_simple,
          subtitle: selectedChapter.translated_name?.name ?? "",
        });
        localStorage.setItem(LS_QALB_LAST_READS, JSON.stringify(updated));
        schedulePushReadingHistory();
      } catch {
        /* ignore */
      }
    }

    let timer;
    function onScroll() {
      clearTimeout(timer);
      timer = setTimeout(updateLastRead, 250);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [view, selectedChapter, translationId, readingLayout]);

  // ── Scroll to target verse (centered) + brief highlight ──────────────────
  useEffect(() => {
    if (!targetVerseRef.current || verses.length === 0) return;
    const key = targetVerseRef.current;
    const el = document.getElementById(`verse-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightVerseKey(key);
      setTimeout(() => setHighlightVerseKey(null), 2500);
      targetVerseRef.current = null;
    }
  }, [verses]);

  // ── Start reading a chapter ───────────────────────────────────────────────
  function startReading(chapter, startVerse = 1) {
    const startPage = Math.ceil(Math.max(startVerse, 1) / BATCH_SIZE);

    setJuzReadContext(null);

    versesSessionRef.current += 1;
    selectedChapterRef.current = chapter;
    currentPageRef.current = startPage;
    hasMoreRef.current = true;
    isLoadingRef.current = false;
    loadMoreBackoffUntilRef.current = 0;

    targetVerseRef.current = startVerse > 1 ? `${chapter.id}:${startVerse}` : null;

    setSelectedChapter(chapter);
    setVerses([]);
    setHasMore(true);
    setIsLoadingMore(false);
    setPlayingKey(null);
    setShowSummary(false);
    setReadingLayout("verses");
    setMushafPage(startPage);
    setMushafVerses([]);
    setMushafHasNext(false);
    setView("reading");

    const awardKey = `${chapter.id}:${new Date().toISOString().split("T")[0]}`;
    if (lastAwardedReadRef.current !== awardKey) {
      award("read_verse_page", { surahNumber: chapter.id });
      lastAwardedReadRef.current = awardKey;
    }

    // Load first batch immediately (bypasses the observer on first render)
    loadMore();
  }

  async function startJuzReading(num) {
    versesSessionRef.current += 1;
    isLoadingRef.current = false;
    hasMoreRef.current = false;

    const first = firstMushafPageForJuz(num);
    const last = lastMushafPageForJuz(num);
    setJuzReadContext({ num, firstPage: first, lastPage: last });
    setMushafPage(first);
    setMushafVerses([]);
    setReadingLayout("juz");
    setVerses([]);
    setHasMore(false);
    setIsLoadingMore(false);
    setPlayingKey(null);
    setShowSummary(false);
    setView("reading");

    let anchorChapter = null;
    try {
      const res = await fetch("/api/quran/juz");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.juzs) ? data.juzs : [];
        const jrec = list.find((x) => Number(x?.juz_number ?? x?.id) === num);
        const fk = firstVerseKeyFromJuzApiRecord(jrec);
        if (fk && chapters?.length) {
          const sid = parseInt(fk.split(":")[0], 10);
          anchorChapter = chapters.find((c) => c.id === sid) ?? null;
        }
      }
    } catch {
      /* ignore */
    }
    if (!anchorChapter && chapters?.length) anchorChapter = chapters[0];
    setSelectedChapter(anchorChapter);

    const awardKey = `juz:${num}:${new Date().toISOString().split("T")[0]}`;
    if (lastAwardedReadRef.current !== awardKey && anchorChapter?.id) {
      award("read_verse_page", { surahNumber: anchorChapter.id });
      lastAwardedReadRef.current = awardKey;
    }
  }

  function enterJuzLayoutFromCurrent() {
    let jn = null;
    if (readingLayout === "verses" && verses[0]?.juz_number) jn = verses[0].juz_number;
    else if ((readingLayout === "mushaf" || readingLayout === "juz") && mushafVerses[0]?.juz_number) {
      jn = mushafVerses[0].juz_number;
    }
    if (!jn) {
      toast.message("Open a surah or mushaf page first, or start from the Juz picker.", { duration: 3500 });
      return;
    }
    const first = firstMushafPageForJuz(jn);
    const last = lastMushafPageForJuz(jn);
    let page = mushafPage;
    if (readingLayout === "verses") {
      const fp = Number(verses[0]?.page_number);
      page = Number.isFinite(fp) && fp > 0 ? fp : first;
    }
    page = Math.min(Math.max(page, first), last);
    setJuzReadContext({ num: jn, firstPage: first, lastPage: last });
    setMushafPage(page);
    setReadingLayout("juz");
  }

  function handleTranslationChange(id) {
    translationIdRef.current = id;
    setTranslationId(id);

    // Reload from scratch with new translation
    if (selectedChapter) {
      versesSessionRef.current += 1;
      selectedChapterRef.current = selectedChapter;
      currentPageRef.current = 1;
      hasMoreRef.current = true;
      isLoadingRef.current = false;
      loadMoreBackoffUntilRef.current = 0;

      setVerses([]);
      setHasMore(true);
      setPlayingKey(null);
      loadMore();
    }

    setShowTranslationPicker(false);
  }

  function handleReciterChange(id) {
    localStorage.setItem("qalb_reciter_id", String(id));
    schedulePushPreferences();
    setReciterId(id);
    setPlayingKey(null);
    setShowReciterPicker(false);
  }

  const currentTranslation = TRANSLATIONS.find((t) => t.id === translationId) ?? TRANSLATIONS[0];
  const currentReciter = READ_RECITERS.find((r) => r.id === reciterId) ?? READ_RECITERS[0];

  // ── Render: Surah Picker ──────────────────────────────────────────────────
  if (view === "picker") {
    return (
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-6">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-foreground mb-1">Read the Quran</h1>
          <p className="text-sm text-muted-foreground">
            {pickerTab === "surah" ? "Choose a surah to begin reading" : "Jump to any juz in mushaf layout"}
          </p>
          <div
            className="mt-4 inline-flex rounded-xl border border-border/40 bg-muted/20 p-0.5 gap-0.5"
            role="tablist"
            aria-label="Read picker mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={pickerTab === "surah"}
              onClick={() => setPickerTab("surah")}
              className={cn(
                "rounded-[10px] px-4 py-1.5 text-xs font-medium transition-colors",
                pickerTab === "surah" ? "bg-card text-accent shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Surahs
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pickerTab === "juz"}
              onClick={() => setPickerTab("juz")}
              className={cn(
                "rounded-[10px] px-4 py-1.5 text-xs font-medium transition-colors",
                pickerTab === "juz" ? "bg-card text-accent shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Juz
            </button>
          </div>
        </div>

        {/* Translation selector */}
        <div className="mb-6 flex justify-end">
          <div className="relative">
            <button
              onClick={() => setShowTranslationPicker((v) => !v)}
              className="text-xs text-muted-foreground border border-border/50 rounded-lg px-3 py-1.5
                hover:border-accent/40 hover:text-foreground transition-all duration-150 flex items-center gap-1.5"
            >
              Translation: <span className="text-foreground/80 font-medium">{currentTranslation.name}</span>
              <span className="opacity-50 text-[10px]">▾</span>
            </button>
            {showTranslationPicker && (
              <div className="absolute right-0 top-9 z-50 w-64 rounded-xl border border-border/60 bg-card shadow-xl p-2 space-y-0.5">
                {TRANSLATIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTranslationChange(t.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-150",
                      t.id === translationId
                        ? "bg-accent/15 text-accent font-medium"
                        : "text-foreground/70 hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="ml-2 text-muted-foreground/60">{t.language}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {pickerTab === "surah" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {(chapters ?? []).map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => startReading(chapter)}
                className="flex flex-col items-start p-3 rounded-xl border border-border/40 bg-card
                  hover:border-accent/40 hover:bg-accent/5 transition-all duration-150 text-left group"
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="text-[10px] text-accent/70 font-semibold">{chapter.id}</span>
                  <span className="text-[9px] text-muted-foreground/50 bg-muted/40 px-1.5 py-0.5 rounded-full">
                    {chapter.verses_count}v
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors truncate w-full">
                  {chapter.name_simple}
                </p>
                <p className="text-[10px] text-muted-foreground/60 truncate w-full">{chapter.translated_name?.name}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
            {Array.from({ length: 30 }, (_, idx) => idx + 1).map((jn) => (
              <button
                key={jn}
                type="button"
                onClick={() => void startJuzReading(jn)}
                className="aspect-square flex flex-col items-center justify-center rounded-xl border border-border/40 bg-card
                  hover:border-accent/40 hover:bg-accent/5 transition-all text-sm font-semibold text-foreground"
              >
                {jn}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Render: Reading View ──────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-6">
      {/* ── Top bar — sticky below global nav ───────────────────────────── */}
      <div
        className="sticky top-14 z-30 -mx-4 md:-mx-8 px-4 md:px-8 mb-6
        bg-background/90 backdrop-blur-md border-b border-border/30 py-3 flex items-center justify-between gap-3"
      >
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ChevronLeft size={14} />
          Back
        </button>

        {/* Title + layout toggle */}
        <div className="flex-1 text-center min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {juzReadContext ? `Juz ${juzReadContext.num}` : selectedChapter?.name_simple}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {juzReadContext
              ? `Mushaf pages ${juzReadContext.firstPage}–${juzReadContext.lastPage}`
              : `${verses.length} / ${selectedChapter?.verses_count ?? "—"} loaded`}
          </p>
          <div
            className="mt-2 inline-flex rounded-lg border border-border/40 bg-muted/20 p-0.5 gap-0.5"
            role="group"
            aria-label="Reading layout"
          >
            <button
              type="button"
              onClick={() => {
                if (readingLayout === "juz" && selectedChapter) {
                  startReading(selectedChapter, 1);
                  return;
                }
                setReadingLayout("verses");
              }}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                readingLayout === "verses"
                  ? "bg-card text-accent shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutList size={11} aria-hidden />
              Verses
            </button>
            <button
              type="button"
              onClick={() => {
                setJuzReadContext(null);
                const firstLoadedPage = Number(verses?.[0]?.page_number);
                setMushafPage(Number.isFinite(firstLoadedPage) && firstLoadedPage > 0 ? firstLoadedPage : 1);
                setReadingLayout("mushaf");
              }}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                readingLayout === "mushaf"
                  ? "bg-card text-accent shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Rows3 size={11} aria-hidden />
              Mushaf
            </button>
            <button
              type="button"
              onClick={enterJuzLayoutFromCurrent}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                readingLayout === "juz"
                  ? "bg-card text-accent shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Layers size={11} aria-hidden />
              Juz
            </button>
          </div>
        </div>

        {/* Settings row */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Translation picker */}
          <div className="relative">
            <button
              onClick={() => {
                setShowTranslationPicker((v) => !v);
                setShowReciterPicker(false);
              }}
              className="text-[10px] text-muted-foreground border border-border/40 rounded-lg px-2.5 py-1
                hover:border-accent/40 hover:text-foreground transition-all duration-150 flex items-center gap-1"
            >
              {currentTranslation.language} <span className="opacity-50">▾</span>
            </button>
            {showTranslationPicker && (
              <div className="absolute right-0 top-8 z-50 w-64 rounded-xl border border-border/60 bg-card shadow-xl p-2 space-y-0.5">
                {TRANSLATIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTranslationChange(t.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-150",
                      t.id === translationId
                        ? "bg-accent/15 text-accent font-medium"
                        : "text-foreground/70 hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="ml-2 text-muted-foreground/60">{t.language}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reciter picker */}
          <div className="relative">
            <button
              onClick={() => {
                setShowReciterPicker((v) => !v);
                setShowTranslationPicker(false);
              }}
              className="text-[10px] text-muted-foreground border border-border/40 rounded-lg px-2.5 py-1
                hover:border-accent/40 hover:text-foreground transition-all duration-150 flex items-center gap-1"
            >
              <Volume2 size={9} className="mr-0.5" />
              {currentReciter.name.split(" ")[0]} <span className="opacity-50">▾</span>
            </button>
            {showReciterPicker && (
              <div className="absolute right-0 top-8 z-50 w-52 rounded-xl border border-border/60 bg-card shadow-xl p-2 space-y-0.5">
                {READ_RECITERS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleReciterChange(r.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-150",
                      r.id === reciterId
                        ? "bg-accent/15 text-accent font-medium"
                        : "text-foreground/70 hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Verses or mushaf flow ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/40 bg-card px-4 md:px-8">
        {verses.length === 0 && isLoadingMore ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-accent/60" />
          </div>
        ) : readingLayout === "mushaf" || readingLayout === "juz" ? (
          <div className="py-8 md:py-10">
            <div className="mb-3 flex justify-center">
              <label className="text-[10px] text-muted-foreground flex items-center gap-2">
                Juz
                <select
                  className="text-[10px] rounded-md border border-border/50 bg-background px-2 py-1"
                  defaultValue=""
                  onChange={(e) => {
                    const j = parseInt(e.target.value, 10);
                    e.target.value = "";
                    if (!Number.isFinite(j) || j < 1 || j > 30) return;
                    const jpFirst = firstMushafPageForJuz(j);
                    const jpLast = lastMushafPageForJuz(j);
                    if (readingLayout === "juz") setJuzReadContext({ num: j, firstPage: jpFirst, lastPage: jpLast });
                    setMushafPage(jpFirst);
                  }}
                >
                  <option value="" disabled>
                    Jump to…
                  </option>
                  {Array.from({ length: 30 }, (_, idx) => idx + 1).map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mb-4 flex items-center justify-center">
              <button
                type="button"
                onClick={toggleMushafPagePlayback}
                disabled={isLoadingMushaf || mushafVerses.length === 0}
                className={cn(
                  "flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50",
                  isMushafPagePlaying
                    ? "border-accent/60 bg-accent/15 text-accent"
                    : "border-border/40 bg-muted/35 text-muted-foreground hover:text-foreground",
                )}
              >
                {isMushafAudioLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : isMushafPagePlaying ? (
                  <Pause size={12} />
                ) : (
                  <Play size={12} />
                )}
                {isMushafPagePlaying ? "Pause page recitation" : "Play page recitation"}
              </button>
            </div>
            <div className="mb-6 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setMushafPage((p) =>
                    Math.max(readingLayout === "juz" && juzReadContext ? juzReadContext.firstPage : 1, p - 1),
                  )
                }
                disabled={
                  isLoadingMushaf ||
                  mushafPage <= (readingLayout === "juz" && juzReadContext ? juzReadContext.firstPage : 1)
                }
                className="text-xs px-3 py-1.5 rounded-lg border border-border/50 text-muted-foreground disabled:opacity-40"
              >
                Previous page
              </button>
              <span className="text-[11px] text-muted-foreground">Page {mushafPage}</span>
              <button
                type="button"
                onClick={() => setMushafPage((p) => p + 1)}
                disabled={isLoadingMushaf || !mushafHasNext}
                className="text-xs px-3 py-1.5 rounded-lg border border-border/50 text-muted-foreground disabled:opacity-40"
              >
                Next page
              </button>
            </div>
            {mushafAudioUrl ? (
              <audio
                ref={mushafAudioRef}
                src={mushafAudioUrl}
                preload="auto"
                onEnded={() => {
                  if (!isMushafPagePlaying) return;
                  if (mushafPlayingIndex >= mushafVerses.length - 1) {
                    setIsMushafPagePlaying(false);
                    award("audio_page_complete", { mushafPage });
                    return;
                  }
                  setMushafPlayingIndex((idx) => idx + 1);
                }}
              />
            ) : null}
            <div className="read-mushaf-flow text-foreground/90 max-w-4xl mx-auto" dir="rtl" lang="ar">
              {(isLoadingMushaf ? [] : mushafVerses).map((verse, idx) => {
                const key = verse.verse_key ?? "";
                const juzNum = JUZ_STARTS.get(key);
                const hizbNum = HIZB_STARTS.get(key);
                const hasMarker = juzNum != null || hizbNum != null;
                return (
                  <Fragment key={`${key}-${translationId}`}>
                    {hasMarker ? (
                      <span className="flex flex-wrap items-center justify-center gap-2 my-5 w-full" dir="ltr">
                        <span className="flex-1 min-w-[2rem] h-px bg-accent/20" />
                        <span className="flex items-center gap-1.5 shrink-0">
                          {juzNum != null && (
                            <span className="text-[10px] font-semibold text-accent bg-accent/12 border border-accent/25 rounded-full px-2 py-0.5">
                              Juz {juzNum}
                            </span>
                          )}
                          {hizbNum != null && (
                            <span className="text-[10px] font-semibold text-accent/70 bg-accent/8 border border-accent/15 rounded-full px-2 py-0.5">
                              Hizb {hizbNum}
                            </span>
                          )}
                        </span>
                        <span className="flex-1 min-w-[2rem] h-px bg-accent/20" />
                      </span>
                    ) : null}
                    <span
                      id={`verse-${key}`}
                      className={cn(
                        "read-mushaf-verse-inline rounded-sm transition-colors",
                        isMushafPagePlaying && mushafPlayingIndex === idx && "bg-accent/20 text-accent",
                      )}
                    >
                      <span className="read-quran-arabic read-quran-arabic--mushaf">
                        {stripVerseEndMarker(verse.text_uthmani ?? "")}
                      </span>
                      <AyahEndBadge verseKey={key} compact />
                      {idx < mushafVerses.length - 1 ? "\u00a0" : null}
                    </span>
                  </Fragment>
                );
              })}
              {isLoadingMushaf ? (
                <div className="py-12 text-center">
                  <Loader2 size={18} className="animate-spin text-accent/70 inline" />
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          verses.map((verse) => (
            <VersePlayer
              key={`${verse.verse_key}-${translationId}`}
              verse={verse}
              reciterId={reciterId}
              playingKey={playingKey}
              setPlayingKey={setPlayingKey}
              isHighlighted={highlightVerseKey === verse.verse_key}
              chapterName={selectedChapter?.name_simple ?? ""}
            />
          ))
        )}
      </div>

      {/* ── Infinite scroll sentinel ──────────────────────────────────── */}
      {readingLayout === "verses" ? <div ref={sentinelRef} className="h-1" /> : null}

      {/* ── Loading more indicator ───────────────────────────────────── */}
      {readingLayout === "verses" && isLoadingMore && verses.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground/60">
          <Loader2 size={13} className="animate-spin" />
          Loading more verses…
        </div>
      )}

      {/* ── All verses loaded ────────────────────────────────────────── */}
      {readingLayout === "verses" && !hasMore && verses.length > 0 && (
        <div className="text-center py-8 border-t border-border/20 mt-4">
          <p className="text-sm text-muted-foreground mb-1">
            You&apos;ve read all {verses.length} verses of{" "}
            <span className="text-accent font-medium">{selectedChapter?.name_simple}</span>
          </p>
          <button onClick={() => setView("picker")} className="text-xs text-accent hover:underline">
            Choose another surah
          </button>
        </div>
      )}

      {/* ── Floating "Key Themes" button ─────────────────────────────── */}
      {verses.length >= 5 && (
        <div className="fixed bottom-24 md:bottom-8 right-4 md:right-6 z-40">
          <button
            onClick={() => setShowSummary(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full
              bg-accent text-accent-foreground text-xs font-semibold
              shadow-lg shadow-accent/25 hover:bg-accent/90
              transition-all duration-200 active:scale-95"
          >
            <Sparkles size={13} />
            Key Themes
          </button>
        </div>
      )}

      {/* ── Summary panel (floating) ─────────────────────────────────── */}
      {showSummary && (
        <SummaryPanel
          verses={verses}
          surahId={selectedChapter?.id}
          surahName={selectedChapter?.name_simple ?? ""}
          onClose={() => setShowSummary(false)}
        />
      )}

      {/* Bottom spacer for mobile nav */}
      <div className="h-20" />
    </div>
  );
}
