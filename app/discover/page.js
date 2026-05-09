/**
 * @fileoverview Discover Page — AI Contextual Verse Discovery
 *
 * The flagship feature of Qalb.
 *
 * The user describes what they are going through in life — stress, grief,
 * gratitude, a big decision, spiritual doubt — and the AI finds the 3
 * most relevant Quran verses and explains why each one speaks to their
 * situation. Responses are grounded in verified Quran Foundation data
 * via the Quran MCP server (no hallucinated references).
 *
 * UX flow:
 *  1. User types their situation in the textarea
 *  2. Example prompts help users who are not sure what to write
 *  3. On submit → loading state with animated indicator
 *  4. Results appear as staggered VerseCard components with AI explanations
 *  5. User can bookmark any verse directly from the result
 *
 * This is a Client Component because the entire interaction is stateful.
 */

"use client";

import { useRef, useState } from "react";

import { RefreshCw, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import VerseCard from "@/components/VerseCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { emitJourneyLocalUpdated } from "@/lib/qalb-journey-events";
import { appendDiscoverHistory, LS_DISCOVER_HISTORY } from "@/lib/qalb-discover-history";
import { useGamification } from "@/lib/useGamification";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Example prompts shown as chips beneath the textarea.
 * Clicking one fills the textarea — helps users understand the feature.
 */
const EXAMPLE_PROMPTS = [
  "I'm feeling anxious about the future and can't stop worrying",
  "I'm going through a difficult loss and need comfort",
  "I feel grateful for everything in my life right now",
  "I'm struggling to stay consistent with my faith after Ramadan",
  "I have a big decision to make and need guidance",
  "I feel lonely and disconnected from my community",
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Discover page — AI-powered contextual verse discovery.
 */
export default function DiscoverPage() {
  // ── State ──────────────────────────────────────────────────────────────────

  /** User's typed or selected situation description */
  const [situation, setSituation] = useState("");

  /** AI result: array of { verse_key, relevance_explanation, theme, verseData } */
  const [results, setResults] = useState([]);

  /** Controls the loading/searching state */
  const [isSearching, setIsSearching] = useState(false);

  /** Tracks if we have shown results at least once (controls empty state) */
  const [hasSearched, setHasSearched] = useState(false);
  const { award } = useGamification();

  const resultsRef = useRef(null);

  // ── Handlers ───────────────────────────────────────────────────────────────

  /**
   * Fills the textarea with a clicked example prompt.
   * @param {string} prompt
   */
  const handleExampleClick = (prompt) => {
    setSituation(prompt);
  };

  /**
   * Submits the user's situation to the AI discovery endpoint,
   * then fetches full verse data for each returned verse key.
   */
  const handleSearch = async () => {
    const trimmed = situation.trim();
    if (trimmed.length < 10) {
      toast.error("Please share a bit more about what you are going through.");
      return;
    }

    setIsSearching(true);
    setResults([]);
    setHasSearched(true);

    try {
      // ── Step 1: AI verse discovery ────────────────────────────────────
      const discoverRes = await fetch("/api/ai/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: trimmed }),
      });

      if (!discoverRes.ok) {
        const err = await discoverRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Discovery failed");
      }

      const { verses: aiVerses } = await discoverRes.json();

      // ── Step 2: Fetch full verse data for each key in parallel ────────
      const verseDataPromises = aiVerses.map(async (aiVerse) => {
        try {
          const res = await fetch(`/api/verse/by-key?key=${aiVerse.verse_key}`);
          if (!res.ok) return null;
          const data = await res.json();
          return { ...aiVerse, verseData: data };
        } catch {
          return null;
        }
      });

      const resolved = (await Promise.all(verseDataPromises)).filter(Boolean);
      setResults(resolved);
      if (resolved.length > 0) award("discover_search");

      try {
        const verseKeys = resolved.map((r) => r?.verse_key).filter(Boolean);
        const next = appendDiscoverHistory(
          { situationSnippet: trimmed.slice(0, 200), verseKeys, at: Date.now() },
          localStorage.getItem(LS_DISCOVER_HISTORY),
        );
        localStorage.setItem(LS_DISCOVER_HISTORY, JSON.stringify(next));
        emitJourneyLocalUpdated();
      } catch {
        /* ignore */
      }

      // Smooth scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (error) {
      toast.error(error.message ?? "Something went wrong. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setSituation("");
    setResults([]);
    setHasSearched(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-6">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 mb-4">
          <Sparkles size={24} className="text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">What&apos;s on your mind?</h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Share what you&apos;re going through and we&apos;ll find Quran verses that speak directly to your situation.
        </p>
      </div>

      {/* ── Input Section ──────────────────────────────────────────────── */}
      <div className="space-y-3 mb-6">
        <Textarea
          placeholder="e.g. I've been feeling overwhelmed lately and losing sight of what matters most..."
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          onKeyDown={(e) => {
            // Submit on Ctrl+Enter / Cmd+Enter
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSearch();
          }}
          className="min-h-[100px] resize-none bg-card border-border/60 focus:border-primary text-sm leading-relaxed"
          maxLength={500}
          aria-label="Describe your situation"
        />

        {/* Character count */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{situation.length}/500 characters</span>
          <div className="flex gap-2">
            {hasSearched && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs h-8">
                <RefreshCw size={12} className="mr-1" />
                Reset
              </Button>
            )}
            <Button
              onClick={handleSearch}
              disabled={isSearching || situation.trim().length < 10}
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary/80"
            >
              {isSearching ? (
                <>
                  <span className="animate-spin mr-1.5">⟳</span>
                  Searching...
                </>
              ) : (
                <>
                  <Send size={12} className="mr-1.5" />
                  Find Verses
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Example Prompts ─────────────────────────────────────────────── */}
      {!hasSearched && (
        <div className="mb-8">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Not sure how to start? Try one of these:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleExampleClick(prompt)}
                className="text-[11px] px-2.5 py-1.5 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
              >
                {prompt.length > 50 ? prompt.slice(0, 50) + "…" : prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading State ───────────────────────────────────────────────── */}
      {isSearching && (
        <div className="space-y-4 max-w-3xl mx-auto">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/50 bg-card/80 p-4 md:p-5 space-y-3 animate-fade-in-up"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full shrink-0 animate-shimmer" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-3 rounded-md animate-shimmer w-[28%] max-w-[8rem]" />
                  <div className="h-4 rounded-md animate-shimmer w-full" />
                  <div className="h-4 rounded-md animate-shimmer w-[92%]" />
                  <div className="h-4 rounded-md animate-shimmer w-[78%]" />
                  <div className="h-3 rounded-md animate-shimmer w-[55%]" />
                </div>
              </div>
            </div>
          ))}
          <p className="text-center text-xs text-muted-foreground animate-pulse pt-1">
            Finding verses that speak to your situation…
          </p>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {!isSearching && results.length > 0 && (
        <div ref={resultsRef} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium text-foreground">
              {results.length} verse{results.length !== 1 ? "s" : ""} found for you
            </p>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {results.map((result, idx) => (
            <div
              key={result.verse_key}
              className="animate-fade-in-up verse-card-enter"
              style={{ animationDelay: `${idx * 120}ms` }}
            >
              <VerseCard
                verse={result.verseData?.verse}
                chapterName={result.verseData?.chapter?.name_simple}
                aiExplanation={result.relevance_explanation}
                theme={result.theme}
                tafsirText={result.verseData?.tafsir?.text}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State (searched but no results) ───────────────────────── */}
      {!isSearching && hasSearched && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm mb-2">No verses found. Try rephrasing your situation.</p>
          <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
