/**
 * @fileoverview VerseDetailClient — Interactive Verse Detail + Reflection Journal
 *
 * Client Component that handles all interactivity on the verse detail page:
 *  - AI reflection question generation (calls /api/ai/reflect)
 *  - Personal note writing and saving (calls /api/user/notes)
 *  - Tafsir expand/collapse
 *  - Audio playback via AudioPlayer
 *
 * Receives server-fetched verse data as props to avoid a waterfall.
 */

"use client";

import { useCallback, useState } from "react";

import { BookOpen, ChevronLeft, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import AudioPlayer from "@/components/AudioPlayer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

/**
 * @param {object} props
 * @param {string} props.verseKey        - e.g. "2:255"
 * @param {object|null} props.initialData - Server-fetched { verse, tafsir, chapter }
 */
export default function VerseDetailClient({ verseKey, initialData }) {
  // ── Derived data ───────────────────────────────────────────────────────────

  const verse = initialData?.verse;
  const tafsir = initialData?.tafsir;
  const chapter = initialData?.chapter;

  const arabicText = verse?.text_uthmani ?? "";
  const translation = verse?.translations?.[0]?.text?.replace(/<[^>]*>/g, "") ?? "";
  const tafsirText = tafsir?.text?.replace(/<[^>]*>/g, " ").trim() ?? "";
  const chapterName = chapter?.name_simple ?? verseKey.split(":")[0];

  // ── State ──────────────────────────────────────────────────────────────────

  const [tafsirExpanded, setTafsirExpanded] = useState(false);

  /** AI-generated reflection questions */
  const [reflectionQuestions, setReflectionQuestions] = useState([]);
  const [loadingReflections, setLoadingReflections] = useState(false);

  /** Personal note text */
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [savedNote, setSavedNote] = useState(null);

  // ── Handlers ───────────────────────────────────────────────────────────────

  /**
   * Calls the AI reflect endpoint to generate 3 personal reflection questions
   * specific to this verse.
   */
  const handleGenerateReflections = useCallback(async () => {
    if (loadingReflections || reflectionQuestions.length > 0) return;

    setLoadingReflections(true);
    try {
      const res = await fetch("/api/ai/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verseKey,
          arabicText,
          translation,
          tafsirSnippet: tafsirText.slice(0, 400), // send a snippet for context
        }),
      });

      if (!res.ok) throw new Error("Failed to generate reflections");
      const { questions } = await res.json();
      setReflectionQuestions(questions);
    } catch {
      toast.error("Could not generate reflection prompts. Please try again.");
    } finally {
      setLoadingReflections(false);
    }
  }, [loadingReflections, reflectionQuestions, verseKey, arabicText, translation, tafsirText]);

  /**
   * Saves the user's personal note for this verse via the Notes API.
   * In production, this requires a user OAuth2 token.
   */
  const handleSaveNote = useCallback(async () => {
    if (!noteText.trim()) {
      toast.error("Please write something before saving.");
      return;
    }

    setIsSavingNote(true);
    try {
      // In production, include Authorization: Bearer <userToken> header
      const res = await fetch("/api/user/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verseKey, text: noteText.trim() }),
      });

      if (res.status === 401) {
        // Not authenticated — save locally for the demo
        setSavedNote({ text: noteText.trim(), savedAt: new Date().toISOString() });
        toast.success("Note saved locally (sign in to sync across devices).");
        return;
      }

      if (!res.ok) throw new Error("Save failed");

      const data = await res.json();
      setSavedNote(data.note ?? { text: noteText.trim(), savedAt: new Date().toISOString() });
      toast.success("Reflection saved to your account.");
    } catch {
      // Fallback: save locally
      setSavedNote({ text: noteText.trim(), savedAt: new Date().toISOString() });
      toast.success("Note saved locally.");
    } finally {
      setIsSavingNote(false);
    }
  }, [noteText, verseKey]);

  // ── Render: not found state ────────────────────────────────────────────────

  if (!verse) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-muted-foreground text-sm mb-4">
          Verse not found. The key &quot;{verseKey}&quot; may be invalid.
        </p>
        <Link href="/">
          <Button variant="outline" size="sm" className="text-xs">
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* ── Back navigation ─────────────────────────────────────────────── */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft size={14} />
        Back
      </Link>

      {/* ── Verse Header ────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">
          {chapterName} · Verse {verseKey.split(":")[1]}
        </p>
        <h1 className="text-sm font-semibold text-foreground">{chapterName}</h1>
      </div>

      {/* ── Arabic Text ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <p className="arabic-text text-foreground/90 text-center" lang="ar" dir="rtl">
          {arabicText}
        </p>
      </div>

      {/* ── Translation ─────────────────────────────────────────────────── */}
      <p className="text-sm leading-relaxed text-foreground/80 px-1">{translation}</p>

      {/* ── Audio Player ─────────────────────────────────────────────────── */}
      <AudioPlayer verseKey={verseKey} />

      <Separator className="bg-border/40" />

      {/* ── Tafsir Section ──────────────────────────────────────────────── */}
      {tafsirText && (
        <section aria-labelledby="tafsir-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="tafsir-heading" className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BookOpen size={14} className="text-accent" />
              Tafsir (Ibn Kathir)
            </h2>
            <button
              onClick={() => setTafsirExpanded((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {tafsirExpanded ? "Show less" : "Read more"}
            </button>
          </div>
          <p className={`text-sm leading-relaxed text-foreground/70 ${tafsirExpanded ? "" : "line-clamp-4"}`}>
            {tafsirText}
          </p>
        </section>
      )}

      <Separator className="bg-border/40" />

      {/* ── AI Reflection Prompts ────────────────────────────────────────── */}
      <section aria-labelledby="reflection-prompts-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="reflection-prompts-heading" className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            Reflect on this verse
          </h2>
        </div>

        {reflectionQuestions.length > 0 ? (
          <ul className="space-y-3">
            {reflectionQuestions.map((question, i) => (
              <li key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15">
                <span className="text-xs font-bold text-accent mt-0.5 shrink-0">{i + 1}.</span>
                <p className="text-sm text-foreground/85 leading-relaxed">{question}</p>
              </li>
            ))}
          </ul>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateReflections}
            disabled={loadingReflections}
            className="w-full text-xs border-dashed h-10"
          >
            {loadingReflections ? (
              <span className="animate-pulse">Generating reflection prompts...</span>
            ) : (
              <>
                <Sparkles size={12} className="mr-1.5 text-accent" />
                Generate Personal Reflection Questions
              </>
            )}
          </Button>
        )}
      </section>

      <Separator className="bg-border/40" />

      {/* ── Personal Journal ─────────────────────────────────────────────── */}
      <section aria-labelledby="journal-heading">
        <h2 id="journal-heading" className="text-sm font-semibold text-foreground mb-3">
          My Reflection
        </h2>

        {savedNote ? (
          <div className="p-4 rounded-xl bg-card border border-border/50 space-y-2">
            <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{savedNote.text}</p>
            <p className="text-[10px] text-muted-foreground">
              Saved {new Date(savedNote.savedAt).toLocaleDateString()}
            </p>
            <button
              onClick={() => {
                setSavedNote(null);
                setNoteText(savedNote.text);
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              placeholder="Write your personal reflection on this verse..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="min-h-[100px] resize-none bg-card border-border/60 text-sm leading-relaxed"
              maxLength={2000}
              aria-label="Personal reflection note"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{noteText.length}/2000</span>
              <Button
                size="sm"
                onClick={handleSaveNote}
                disabled={isSavingNote || !noteText.trim()}
                className="h-8 text-xs bg-primary hover:bg-primary/80"
              >
                <Save size={12} className="mr-1.5" />
                {isSavingNote ? "Saving..." : "Save Reflection"}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
