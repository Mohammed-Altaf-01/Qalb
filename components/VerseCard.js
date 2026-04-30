/**
 * @fileoverview VerseCard Component
 *
 * The primary display unit of the Qalb application — renders a single
 * Quran verse with its Arabic text, translation, audio controls, and
 * contextual actions (bookmark, reflect, expand tafsir).
 *
 * Design:
 *  - Self-contained: handles its own bookmark state optimistically
 *  - Composable: accepts optional slots (aiExplanation, tafsirText)
 *    so it works across Home, Discover, and Library pages
 *  - Accessible: all interactive elements have aria-labels
 *
 * @example
 * <VerseCard
 *   verse={{ verse_key: "2:255", text_uthmani: "...", translations: [...] }}
 *   chapterName="Al-Baqarah"
 *   aiExplanation="This verse speaks to..."   // optional, from Discover page
 *   theme="Trust"                              // optional label badge
 *   userToken="Bearer xyz"                     // optional, enables bookmark
 * />
 */

"use client";

import { useCallback, useRef, useState } from "react";

import { Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Loader2, Pause, Play, Sparkles, Volume2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import AudioPlayer from "@/components/AudioPlayer";
import { Badge } from "@/components/ui/badge";
import { filterVerseWords } from "@/lib/arabic-utils";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// WordHighlightPlayer — inline mini player with word-by-word highlighting
// Used when verse.words is available (e.g. Discover page)
// ─────────────────────────────────────────────────────────────────────────────

function findActiveWord(currentMs, segments) {
  if (!segments?.length) return -1;
  for (const seg of segments) {
    if (currentMs >= seg[2] && currentMs < seg[3]) return seg[1] - 1;
  }
  return -1;
}

function WordHighlightPlayer({ verseKey, words }) {
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [segments, setSegments] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIdx, setActiveWordIdx] = useState(-1);
  const [reciterId] = useState(() => {
    if (typeof window === "undefined") return 7;
    const saved = parseInt(localStorage.getItem("qalb_reciter_id") ?? "0", 10);
    return [1, 2, 3, 6, 7, 10].includes(saved) ? saved : 7;
  });

  async function handlePlay() {
    if (isLoading) return;
    if (!audioUrl) {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/verse/audio?key=${encodeURIComponent(verseKey)}&reciter=${reciterId}&segments=true`,
        );
        if (!res.ok) throw new Error("audio failed");
        const data = await res.json();
        setAudioUrl(data.audioUrl);
        setSegments(data.segments ?? null);
        audioRef.current.src = data.audioUrl;
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        toast.error("Audio unavailable for this verse");
      } finally {
        setIsLoading(false);
      }
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }

  return (
    <div className="space-y-2">
      {/* Word-by-word Arabic */}
      <p className="arabic-text arabic-text-display text-foreground/90" lang="ar" dir="rtl">
        {words.map((word, i) => (
          <span
            key={i}
            className={cn(
              "inline px-0.5 mx-0.5 rounded transition-all duration-100",
              activeWordIdx === (word.position ?? i + 1) - 1 ? "bg-accent/30 text-accent" : "hover:text-accent/80",
            )}
          >
            {word.text_uthmani}
          </span>
        ))}
      </p>
      {/* Mini play button */}
      <button
        onClick={handlePlay}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
      >
        {isLoading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : isPlaying ? (
          <Pause size={13} />
        ) : (
          <Play size={13} />
        )}
        <span>{isPlaying ? "Pause" : "Play recitation"}</span>
      </button>
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (!audioRef.current || !segments) return;
          setActiveWordIdx(findActiveWord(audioRef.current.currentTime * 1000, segments));
        }}
        onEnded={() => {
          setIsPlaying(false);
          setActiveWordIdx(-1);
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object}  props
 * @param {object}  props.verse            - Verse data from Quran Foundation API
 * @param {string}  [props.chapterName]    - Human-readable chapter name (e.g. "Al-Baqarah")
 * @param {string}  [props.aiExplanation]  - AI-generated relevance explanation (Discover page)
 * @param {string}  [props.theme]          - One/two-word theme label for the badge
 * @param {string}  [props.tafsirText]     - Optional tafsir snippet to expand
 * @param {boolean} [props.initialBookmarked=false] - Whether verse is already bookmarked
 * @param {string}  [props.userToken]      - OAuth2 token; if absent, bookmark is hidden
 * @param {string}  [props.className]      - Additional class names
 */
export default function VerseCard({
  verse,
  chapterName,
  aiExplanation,
  theme,
  tafsirText,
  initialBookmarked = false,
  userToken,
  className,
}) {
  // ── Local State ────────────────────────────────────────────────────────────

  /** Optimistic bookmark state — updates immediately, syncs to server */
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isBookmarking, setIsBookmarking] = useState(false);

  /** Toggle between collapsed/expanded tafsir snippet */
  const [tafsirExpanded, setTafsirExpanded] = useState(false);

  /** Show/hide the inline audio player */
  const [showAudio, setShowAudio] = useState(false);

  // ── Derived Values ─────────────────────────────────────────────────────────

  const verseKey = verse?.verse_key ?? "";
  const arabicText = verse?.text_uthmani ?? "";
  const translation = verse?.translations?.[0]?.text ?? "";
  const verseNumber = verse?.verse_number ?? "";
  const words = filterVerseWords(verse?.words);

  // Strip HTML tags that sometimes come from the API's translation field
  const cleanTranslation = translation.replace(/<[^>]*>/g, "");

  // ── Handlers ───────────────────────────────────────────────────────────────

  /**
   * Toggles the bookmark state optimistically, then syncs to the server.
   * If the server request fails, the state is rolled back.
   */
  const handleBookmark = useCallback(async () => {
    if (!userToken || isBookmarking) return;

    // Optimistic update — feels instant to the user
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    setIsBookmarking(true);

    try {
      const method = prev ? "DELETE" : "POST";
      const res = await fetch("/api/user/bookmark", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ verseKey }),
      });

      if (!res.ok) throw new Error("Bookmark request failed");

      toast.success(prev ? "Bookmark removed" : "Verse bookmarked");
    } catch {
      // Rollback optimistic update on failure
      setIsBookmarked(prev);
      toast.error("Could not update bookmark. Please try again.");
    } finally {
      setIsBookmarking(false);
    }
  }, [userToken, isBookmarking, isBookmarked, verseKey]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!verse) return null;

  return (
    <article
      className={cn(
        "rounded-2xl border border-border/50 bg-card overflow-hidden",
        "transition-shadow hover:shadow-lg hover:shadow-black/20",
        "animate-fade-in-up verse-card-enter",
        className,
      )}
      aria-label={`Verse ${verseKey}`}
    >
      {/* ── Card Header: Reference + Actions ──────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        {/* Verse reference badge */}
        <div className="flex items-center gap-2">
          <Link
            href={`/verse/${verseKey}`}
            className="text-xs font-medium text-muted-foreground hover:text-accent transition-colors"
            aria-label={`View full detail for verse ${verseKey}`}
          >
            {chapterName ? `${chapterName} · ${verseNumber}` : verseKey}
          </Link>
          {theme && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-accent/40 text-accent">
              {theme}
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Audio toggle */}
          <button
            onClick={() => setShowAudio((v) => !v)}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              showAudio ? "text-accent bg-accent/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5",
            )}
            aria-label={showAudio ? "Hide audio player" : "Play verse recitation"}
          >
            <Volume2 size={16} />
          </button>

          {/* Bookmark — only shown if userToken is provided */}
          {userToken && (
            <button
              onClick={handleBookmark}
              disabled={isBookmarking}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                isBookmarked
                  ? "text-accent bg-accent/10 scale-110"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
              )}
              aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this verse"}
              aria-pressed={isBookmarked}
            >
              {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* ── Arabic Text + Word Highlight Player ───────────────────────── */}
      <div className="px-4 py-3">
        {showAudio && words.length > 0 ? (
          <WordHighlightPlayer verseKey={verseKey} words={words} />
        ) : (
          <p className="arabic-text arabic-text-display text-foreground/90 mb-3" lang="ar" dir="rtl">
            {arabicText}
          </p>
        )}

        {/* ── English Translation ──────────────────────────────────────── */}
        <p className="text-sm md:text-base leading-relaxed text-foreground/75 mt-3">{cleanTranslation}</p>
      </div>

      {/* ── Audio Player fallback (no words available) ────────────────── */}
      {showAudio && verseKey && words.length === 0 && (
        <div className="px-4 pb-3">
          <AudioPlayer verseKey={verseKey} />
        </div>
      )}

      {/* ── AI Relevance Explanation (Discover page) ──────────────────── */}
      {aiExplanation && (
        <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-start gap-2">
            <Sparkles size={14} className="text-accent mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed text-foreground/80">{aiExplanation}</p>
          </div>
        </div>
      )}

      {/* ── Tafsir Snippet (expandable with Read more link) ───────────── */}
      {tafsirText && (
        <div className="border-t border-border/40 px-4 py-2">
          <button
            onClick={() => setTafsirExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
            aria-expanded={tafsirExpanded}
          >
            {tafsirExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {tafsirExpanded ? "Hide" : "Show"} tafsir (Ibn Kathir)
          </button>

          {tafsirExpanded && (
            <div className="mt-2">
              <p className="text-xs leading-relaxed text-foreground/70 line-clamp-6">
                {tafsirText.replace(/<[^>]*>/g, " ").trim()}
              </p>
              <Link
                href={`/verse/${verseKey}?tab=tafsir`}
                className="mt-1.5 inline-block text-[11px] text-accent hover:underline"
              >
                Read full tafsir →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Footer: link to full verse page ───────────────────────────── */}
      <div className="px-4 pb-3 pt-1">
        <Link
          href={`/verse/${verseKey}`}
          className="text-[11px] text-muted-foreground hover:text-accent transition-colors"
        >
          Reflect on this verse →
        </Link>
      </div>
    </article>
  );
}
