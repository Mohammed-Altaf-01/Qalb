/**
 * @fileoverview ReadClient — Interactive Quran Reading Mode
 *
 * Two-phase UI:
 *  1. Surah Picker — grid of all 114 surahs; user picks one to begin
 *  2. Reading View — paginated verses (15/page) with:
 *       - Arabic text + chosen translation
 *       - Translation language picker
 *       - "See Page Summary" triggers streaming AI summary
 *       - Cumulative "Journey So Far" card at the top of each page
 *       - Reading progress saved in localStorage
 *
 * AI summary uses Claude (no MCP needed — just text generation).
 */

"use client";

import { useEffect, useRef, useState } from "react";

import { BookOpen, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Translation catalogue — curated popular translations by language
// ─────────────────────────────────────────────────────────────────────────────

// Verified against Quran Foundation API — /content/api/v4/resources/translations
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
const VERSES_PER_PAGE = 15;
const LS_KEY = "qalb_reading_progress";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Single verse in reading mode */
function ReadVerse({ verse }) {
  const arabic = verse.text_uthmani ?? "";
  const translation = verse.translations?.[0]?.text?.replace(/<[^>]*>/g, "") ?? "";
  const verseKey = verse.verse_key ?? "";
  const [chapter, num] = verseKey.split(":");

  return (
    <div className="py-6 border-b border-border/25 last:border-0">
      {/* Verse number badge */}
      <div className="flex justify-center mb-4">
        <span className="text-[10px] text-accent/70 bg-accent/10 border border-accent/20 rounded-full px-3 py-0.5 font-medium">
          {verseKey}
        </span>
      </div>

      {/* Arabic */}
      {arabic && (
        <p className="arabic-text text-foreground/90 text-center mb-5 leading-loose" lang="ar" dir="rtl">
          {arabic}
        </p>
      )}

      {/* Translation */}
      {translation && (
        <p className="text-sm leading-relaxed text-foreground/70 text-center max-w-2xl mx-auto px-4">{translation}</p>
      )}
    </div>
  );
}

/** Streaming / completed AI summary card */
function SummaryCard({ text, isStreaming, pageNumber }) {
  return (
    <div className="rounded-2xl border border-accent/25 bg-accent/5 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
          <Sparkles size={10} className="text-accent" />
        </div>
        <p className="text-xs font-semibold text-accent">Page {pageNumber} Summary</p>
        {isStreaming && <Loader2 size={11} className="animate-spin text-accent/60 ml-auto" />}
      </div>

      <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
        {text}
        {isStreaming && <span className="inline-block w-0.5 h-3.5 bg-accent/70 ml-0.5 align-middle animate-pulse" />}
      </div>
    </div>
  );
}

/** Collapsible "Journey So Far" cumulative summary */
function JourneyCard({ summary, currentPage }) {
  const [open, setOpen] = useState(false);
  if (!summary) return null;

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-4 mb-6">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
        <span className="text-xs font-semibold text-foreground/80 flex items-center gap-2">
          <BookOpen size={12} className="text-accent/60" />
          Journey so far · Pages 1–{currentPage - 1}
        </span>
        <ChevronRight
          size={13}
          className={cn("text-muted-foreground transition-transform duration-200", open && "rotate-90")}
        />
      </button>
      {open && (
        <p className="mt-3 text-xs leading-relaxed text-foreground/65 whitespace-pre-wrap border-t border-border/30 pt-3">
          {summary}
        </p>
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
export default function ReadClient({ chapters }) {
  // ── View state ───────────────────────────────────────────────────────────
  const [view, setView] = useState("picker"); // "picker" | "reading"

  // ── Surah / Translation ──────────────────────────────────────────────────
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [translationId, setTranslationId] = useState(DEFAULT_TRANSLATION_ID);
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);

  // ── Verses ───────────────────────────────────────────────────────────────
  const [verses, setVerses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingVerses, setIsLoadingVerses] = useState(false);

  // ── AI Summary ───────────────────────────────────────────────────────────
  /** page → summary text, built up as user progresses */
  const [pageSummaries, setPageSummaries] = useState({});
  const [cumulativeSummary, setCumulativeSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [streamingSummary, setStreamingSummary] = useState("");
  const [summaryDone, setSummaryDone] = useState(false);

  const summaryRef = useRef(null);

  // ── Restore last reading position ────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? "null");
      if (saved?.surahId && chapters?.length > 0) {
        const chapter = chapters.find((c) => c.id === saved.surahId);
        if (chapter) {
          setSelectedChapter(chapter);
          setCurrentPage(saved.page ?? 1);
          setTranslationId(saved.translationId ?? DEFAULT_TRANSLATION_ID);
          setCumulativeSummary(saved.cumulativeSummary ?? "");
          setPageSummaries(saved.pageSummaries ?? {});
          setView("reading");
        }
      }
    } catch {
      // ignore corrupt localStorage
    }
  }, [chapters]);

  // ── Save reading position whenever it changes ─────────────────────────────
  useEffect(() => {
    if (!selectedChapter) return;
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          surahId: selectedChapter.id,
          page: currentPage,
          translationId,
          cumulativeSummary,
          pageSummaries,
        }),
      );
    } catch {
      // quota exceeded — ignore
    }
  }, [selectedChapter, currentPage, translationId, cumulativeSummary, pageSummaries]);

  // ── Fetch verses whenever chapter / page / translation changes ─────────────
  useEffect(() => {
    if (!selectedChapter || view !== "reading") return;

    setIsLoadingVerses(true);
    setVerses([]);
    setSummaryDone(false);
    setStreamingSummary("");

    fetch(
      `/api/verse/by-chapter?surah=${selectedChapter.id}&page=${currentPage}&perPage=${VERSES_PER_PAGE}&translation=${translationId}`,
    )
      .then((r) => r.json())
      .then((data) => {
        setVerses(data.verses ?? []);
        setPagination(data.pagination ?? null);
      })
      .catch(console.error)
      .finally(() => setIsLoadingVerses(false));
  }, [selectedChapter, currentPage, translationId, view]);

  // ── Auto-scroll to summary when it starts streaming ─────────────────────
  useEffect(() => {
    if (isSummarizing && summaryRef.current) {
      summaryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isSummarizing]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleSelectSurah(chapter) {
    setSelectedChapter(chapter);
    setCurrentPage(1);
    setPageSummaries({});
    setCumulativeSummary("");
    setSummaryDone(false);
    setStreamingSummary("");
    setView("reading");
  }

  async function handleGenerateSummary() {
    if (isSummarizing || verses.length === 0) return;

    setIsSummarizing(true);
    setStreamingSummary("");
    setSummaryDone(false);

    const versesPayload = verses.map((v) => ({
      verseKey: v.verse_key,
      arabic: v.text_uthmani ?? "",
      translation: v.translations?.[0]?.text?.replace(/<[^>]*>/g, "") ?? "",
    }));

    try {
      const res = await fetch("/api/ai/read-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surahName: selectedChapter?.name_simple ?? "",
          pageNumber: currentPage,
          verses: versesPayload,
          priorSummary: cumulativeSummary,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreamingSummary(full);
      }

      // Commit this page's summary
      setPageSummaries((prev) => ({ ...prev, [currentPage]: full }));

      // Update cumulative summary — send the new full text as the running total
      const newCumulative = cumulativeSummary
        ? `${cumulativeSummary}\n\n[Page ${currentPage}]\n${full}`
        : `[Page ${currentPage}]\n${full}`;
      setCumulativeSummary(newCumulative);

      setSummaryDone(true);
    } catch (err) {
      console.error("[ReadClient] summary error:", err);
      setStreamingSummary("Could not generate summary. Please try again.");
      setSummaryDone(true);
    } finally {
      setIsSummarizing(false);
    }
  }

  function handleNextPage() {
    setCurrentPage((p) => p + 1);
    setSummaryDone(false);
    setStreamingSummary("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePrevPage() {
    if (currentPage <= 1) return;
    setCurrentPage((p) => p - 1);
    setSummaryDone(false);
    setStreamingSummary("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const totalPages = pagination?.total_pages ?? 1;
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;
  const currentSummary = pageSummaries[currentPage];
  const activeSummary = streamingSummary || currentSummary || "";
  const showSummaryCard = isSummarizing || !!activeSummary;

  const currentTranslation = TRANSLATIONS.find((t) => t.id === translationId) ?? TRANSLATIONS[0];

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
                    onClick={() => {
                      setTranslationId(t.id);
                      setShowTranslationPicker(false);
                    }}
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
              onClick={() => handleSelectSurah(chapter)}
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
        <button
          onClick={() => {
            setView("picker");
          }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} />
          Surahs
        </button>

        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-foreground">{selectedChapter?.name_simple}</p>
          <p className="text-[10px] text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
        </div>

        {/* Translation picker */}
        <div className="relative">
          <button
            onClick={() => setShowTranslationPicker((v) => !v)}
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
                  onClick={() => {
                    setTranslationId(t.id);
                    setShowTranslationPicker(false);
                  }}
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

      {/* ── Cumulative journey summary (collapsed) ──────────────────────── */}
      {currentPage > 1 && cumulativeSummary && <JourneyCard summary={cumulativeSummary} currentPage={currentPage} />}

      {/* ── Verses ──────────────────────────────────────────────────────── */}
      {isLoadingVerses ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-accent/60" />
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-card px-4 md:px-8">
          {verses.map((verse) => (
            <ReadVerse key={verse.verse_key} verse={verse} />
          ))}
        </div>
      )}

      {/* ── Pagination bar (top/bottom) ──────────────────────────────────── */}
      {!isLoadingVerses && verses.length > 0 && (
        <div className="flex items-center justify-between mt-4 mb-6">
          <button
            onClick={handlePrevPage}
            disabled={!hasPrevPage}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground
              disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="text-[10px] text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={!hasNextPage || !summaryDone}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground
              disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── AI Summary section ───────────────────────────────────────────── */}
      {!isLoadingVerses && verses.length > 0 && (
        <div ref={summaryRef} className="space-y-4">
          {showSummaryCard ? (
            <>
              <SummaryCard text={activeSummary} isStreaming={isSummarizing} pageNumber={currentPage} />

              {/* Next page button — only after summary is done */}
              {summaryDone && hasNextPage && (
                <button
                  onClick={handleNextPage}
                  className="w-full py-3 rounded-xl border border-accent/30 bg-accent/8
                    text-sm font-medium text-accent hover:bg-accent/15
                    transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Continue to Page {currentPage + 1}
                  <ChevronRight size={15} />
                </button>
              )}

              {summaryDone && !hasNextPage && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    You&apos;ve completed{" "}
                    <span className="text-accent font-medium">{selectedChapter?.name_simple}</span>
                  </p>
                  <button onClick={() => setView("picker")} className="text-xs text-accent hover:underline">
                    Choose another surah
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={handleGenerateSummary}
              className="w-full py-3.5 rounded-xl border border-dashed border-accent/30 bg-accent/5
                hover:bg-accent/10 hover:border-accent/50
                text-sm text-foreground/70 hover:text-foreground
                transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Sparkles size={14} className="text-accent" />
              See Page Summary &amp; Key Themes
            </button>
          )}
        </div>
      )}

      {/* Bottom spacer for mobile nav */}
      <div className="h-20" />
    </div>
  );
}
