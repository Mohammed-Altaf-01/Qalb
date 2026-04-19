"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import Link from "next/link";

import { filterVerseWords, stripVerseEndMarker } from "@/lib/arabic-utils";
import { cn } from "@/lib/utils";

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

const RECITERS = [
  { id: 7, name: "Mishari Alafasy" },
  { id: 3, name: "Abdul Rahman Al-Sudais" },
  { id: 2, name: "AbdulBaset (Murattal)" },
  { id: 1, name: "AbdulBaset (Mujawwad)" },
  { id: 6, name: "Mahmoud Al-Husary" },
  { id: 10, name: "Saud Al-Shuraym" },
];

const DEFAULT_TRANSLATION_ID = 20;
const BATCH_SIZE = 20;
const LS_KEY = "qalb_reading_progress";

// ─────────────────────────────────────────────────────────────────────────────
// VersePlayer — word-by-word audio with highlighting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the 0-based word array index active at `currentMs`.
 * Real API segment format: [segment_idx, word_position_1based, start_ms, end_ms]
 */
function findActiveWord(currentMs, segments) {
  if (!segments?.length) return -1;
  for (const seg of segments) {
    const wordPos = seg[1]; // 1-based position within the verse
    const startMs = seg[2];
    const endMs = seg[3];
    if (currentMs >= startMs && currentMs < endMs) return wordPos - 1; // convert to 0-based
  }
  return -1;
}

function VersePlayer({ verse, reciterId, playingKey, setPlayingKey }) {
  const verseKey = verse.verse_key ?? "";
  const words = filterVerseWords(verse.words);
  const arabic = stripVerseEndMarker(verse.text_uthmani ?? "");
  const translation = verse.translations?.[0]?.text?.replace(/<[^>]*>/g, "") ?? "";

  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [segments, setSegments] = useState(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [activeWordIdx, setActiveWordIdx] = useState(-1);
  const [audioError, setAudioError] = useState(false);

  const isPlaying = playingKey === verseKey;

  // Reset cached audio when reciter changes
  useEffect(() => {
    setAudioUrl(null);
    setSegments(null);
    setAudioError(false);
    if (playingKey === verseKey) setPlayingKey(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reciterId]);

  // Sync audio element with playing state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      audio.play().catch(() => setAudioError(true));
    } else {
      audio.pause();
      audio.currentTime = 0;
      setActiveWordIdx(-1);
    }
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

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current || !segments) return;
    const ms = audioRef.current.currentTime * 1000;
    setActiveWordIdx(findActiveWord(ms, segments));
  }, [segments]);

  const handleEnded = useCallback(() => {
    setPlayingKey(null);
    setActiveWordIdx(-1);
  }, [setPlayingKey]);

  return (
    <div id={`verse-${verseKey}`} className="py-7 border-b border-border/20 last:border-0 group/verse">
      {/* Verse number badge */}
      <div className="flex justify-center mb-5">
        <span className="text-[10px] text-accent/60 bg-accent/8 border border-accent/15 rounded-full px-3 py-0.5 font-medium">
          {verseKey}
        </span>
      </div>

      {/* Arabic — word-by-word spans if available, plain text fallback */}
      <div className="text-center mb-5 px-2 overflow-hidden">
        {words.length > 0 ? (
          <p className="arabic-text text-foreground/90 leading-loose" lang="ar" dir="rtl">
            {words.map((word, i) => (
              <span
                key={word.id ?? i}
                className={cn(
                  "inline px-0.5 mx-0.5 rounded transition-all duration-100",
                  // word.position is 1-based; activeWordIdx is 0-based (position - 1)
                  activeWordIdx === (word.position ?? i + 1) - 1
                    ? "bg-accent/30 text-accent drop-shadow-sm"
                    : "hover:text-accent/80",
                )}
              >
                {word.text_uthmani}
              </span>
            ))}
          </p>
        ) : (
          <p className="arabic-text text-foreground/90 leading-loose" lang="ar" dir="rtl">
            {arabic}
          </p>
        )}
      </div>

      {/* Translation */}
      {translation && (
        <p className="text-sm leading-relaxed text-foreground/65 text-center max-w-2xl mx-auto px-4 mb-4">
          {translation}
        </p>
      )}

      {/* Audio player + Reflect link */}
      <div className="flex items-center justify-center gap-3 mt-1">
        {/* Hidden audio element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={() => {
              setAudioError(true);
              setPlayingKey(null);
            }}
          />
        )}

        {/* Play/Pause button */}
        {audioError ? (
          <span className="text-[10px] text-muted-foreground/40">Audio unavailable</span>
        ) : (
          <button
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
            <span>{isPlaying ? "Pause" : words.length > 0 ? "Play word-by-word" : "Play"}</span>
          </button>
        )}

        {/* Reflect & Chat link */}
        {verseKey && (
          <Link
            href={`/verse/${verseKey}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/45
              hover:text-accent transition-colors duration-150 group/reflect"
          >
            <MessageCircle size={12} className="group-hover/reflect:text-accent transition-colors" />
            <span>Reflect &amp; Chat</span>
          </Link>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SummaryPanel — AI themes/summary for all loaded verses
// ─────────────────────────────────────────────────────────────────────────────

function SummaryPanel({ verses, surahName, onClose }) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!verses?.length) return;

    const versesPayload = verses.slice(0, 60).map((v) => ({
      verseKey: v.verse_key,
      arabic: v.text_uthmani ?? "",
      translation: v.translations?.[0]?.text?.replace(/<[^>]*>/g, "") ?? "",
    }));

    setStreaming(true);
    setText("");
    setDone(false);

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
      })
      .catch(() => {
        setText("Could not generate summary. Please try again.");
        setDone(true);
      })
      .finally(() => setStreaming(false));
  }, []); // run once on mount

  return (
    <div
      className="fixed inset-x-4 bottom-20 md:bottom-6 md:inset-x-auto md:right-6 md:left-auto md:w-[420px]
      z-50 rounded-2xl border border-accent/25 bg-card shadow-2xl shadow-black/30 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-accent/5">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <span className="text-xs font-semibold text-foreground">Key Themes — {surahName}</span>
          {streaming && <Loader2 size={11} className="animate-spin text-accent/60" />}
        </div>
        <button onClick={onClose} className="text-muted-foreground/60 hover:text-foreground transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-4 max-h-64 overflow-y-auto text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
        {text || <span className="text-muted-foreground/50 text-xs">Generating…</span>}
        {streaming && <span className="inline-block w-0.5 h-3.5 bg-accent/70 ml-0.5 align-middle animate-pulse" />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ReadClient({ chapters, initialSurahId, initialStartVerse = 1 }) {
  // ── View ─────────────────────────────────────────────────────────────────
  const [view, setView] = useState("picker");

  // ── Chapter / settings ──────────────────────────────────────────────────
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [translationId, setTranslationId] = useState(DEFAULT_TRANSLATION_ID);
  const [reciterId, setReciterId] = useState(() => {
    if (typeof window === "undefined") return 7;
    const saved = parseInt(localStorage.getItem("qalb_reciter_id") ?? "0", 10);
    return RECITERS.some((r) => r.id === saved) ? saved : 7;
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
  const selectedChapterRef = useRef(null);
  const translationIdRef = useRef(DEFAULT_TRANSLATION_ID);

  // ── Audio ────────────────────────────────────────────────────────────────
  const [playingKey, setPlayingKey] = useState(null);

  // ── Summary ──────────────────────────────────────────────────────────────
  const [showSummary, setShowSummary] = useState(false);

  // ── Sentinel for infinite scroll ─────────────────────────────────────────
  const sentinelRef = useRef(null);

  // ── Target verse to scroll to after initial load ─────────────────────────
  const targetVerseRef = useRef(null);

  // ── Load more verses ──────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreRef.current || !selectedChapterRef.current) return;

    isLoadingRef.current = true;
    setIsLoadingMore(true);

    const page = currentPageRef.current;
    const chapter = selectedChapterRef.current;
    const translation = translationIdRef.current;

    try {
      const res = await fetch(
        `/api/verse/by-chapter?surah=${chapter.id}&page=${page}&perPage=${BATCH_SIZE}&translation=${translation}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const newVerses = data.verses ?? [];

      setVerses((prev) => {
        const seen = new Set(prev.map((v) => v.verse_key));
        return [...prev, ...newVerses.filter((v) => !seen.has(v.verse_key))];
      });

      const pagination = data.pagination ?? {};
      if (!pagination.total_pages || page >= pagination.total_pages) {
        hasMoreRef.current = false;
        setHasMore(false);
      } else {
        currentPageRef.current = page + 1;
      }
    } catch (err) {
      console.error("[ReadClient] loadMore:", err);
    } finally {
      isLoadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, []);

  // ── Intersection Observer — triggers loadMore when sentinel enters view ──
  useEffect(() => {
    if (view !== "reading") return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Skip if already loading — prevents double-fire on initial mount
        if (entries[0].isIntersecting && !isLoadingRef.current) loadMore();
      },
      { rootMargin: "300px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [view, loadMore]);

  // ── Restore last position / handle initialSurahId ────────────────────────
  useEffect(() => {
    if (!chapters?.length) return;

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
          startReading(chapter);
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters, initialSurahId]);

  // ── Save progress ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedChapter) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ surahId: selectedChapter.id, translationId }));
    } catch {
      /* quota exceeded */
    }
  }, [selectedChapter, translationId]);

  // ── Scroll to target verse after initial batch loads ─────────────────────
  useEffect(() => {
    if (!targetVerseRef.current || verses.length === 0) return;
    const el = document.getElementById(`verse-${targetVerseRef.current}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      targetVerseRef.current = null;
    }
  }, [verses]);

  // ── Start reading a chapter ───────────────────────────────────────────────
  function startReading(chapter, startVerse = 1) {
    const startPage = Math.ceil(Math.max(startVerse, 1) / BATCH_SIZE);

    selectedChapterRef.current = chapter;
    currentPageRef.current = startPage;
    hasMoreRef.current = true;
    isLoadingRef.current = false;

    targetVerseRef.current = startVerse > 1 ? `${chapter.id}:${startVerse}` : null;

    setSelectedChapter(chapter);
    setVerses([]);
    setHasMore(true);
    setIsLoadingMore(false);
    setPlayingKey(null);
    setShowSummary(false);
    setView("reading");

    // Load first batch immediately (bypasses the observer on first render)
    loadMore();
  }

  function handleTranslationChange(id) {
    translationIdRef.current = id;
    setTranslationId(id);

    // Reload from scratch with new translation
    if (selectedChapter) {
      selectedChapterRef.current = selectedChapter;
      currentPageRef.current = 1;
      hasMoreRef.current = true;
      isLoadingRef.current = false;

      setVerses([]);
      setHasMore(true);
      setPlayingKey(null);
      loadMore();
    }

    setShowTranslationPicker(false);
  }

  function handleReciterChange(id) {
    localStorage.setItem("qalb_reciter_id", String(id));
    setReciterId(id);
    setPlayingKey(null);
    setShowReciterPicker(false);
  }

  const currentTranslation = TRANSLATIONS.find((t) => t.id === translationId) ?? TRANSLATIONS[0];
  const currentReciter = RECITERS.find((r) => r.id === reciterId) ?? RECITERS[0];

  // ── Render: Surah Picker ──────────────────────────────────────────────────
  if (view === "picker") {
    return (
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-6">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-foreground mb-1">Read the Quran</h1>
          <p className="text-sm text-muted-foreground">Choose a surah to begin reading</p>
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

        {/* Chapter grid */}
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
      </div>
    );
  }

  // ── Render: Reading View ──────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-6">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 gap-3">
        {/* Back button */}
        <button
          onClick={() => setView("picker")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ChevronLeft size={14} />
          Surahs
        </button>

        {/* Title */}
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-foreground">{selectedChapter?.name_simple}</p>
          <p className="text-[10px] text-muted-foreground">
            {verses.length} / {selectedChapter?.verses_count} verses
          </p>
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
                {RECITERS.map((r) => (
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

      {/* ── Verses ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/40 bg-card px-4 md:px-8">
        {verses.length === 0 && isLoadingMore ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-accent/60" />
          </div>
        ) : (
          verses.map((verse) => (
            <VersePlayer
              key={`${verse.verse_key}-${translationId}`}
              verse={verse}
              reciterId={reciterId}
              playingKey={playingKey}
              setPlayingKey={setPlayingKey}
            />
          ))
        )}
      </div>

      {/* ── Infinite scroll sentinel ──────────────────────────────────── */}
      <div ref={sentinelRef} className="h-1" />

      {/* ── Loading more indicator ───────────────────────────────────── */}
      {isLoadingMore && verses.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground/60">
          <Loader2 size={13} className="animate-spin" />
          Loading more verses…
        </div>
      )}

      {/* ── All verses loaded ────────────────────────────────────────── */}
      {!hasMore && verses.length > 0 && (
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
          surahName={selectedChapter?.name_simple ?? ""}
          onClose={() => setShowSummary(false)}
        />
      )}

      {/* Bottom spacer for mobile nav */}
      <div className="h-20" />
    </div>
  );
}
