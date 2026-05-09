/**
 * @fileoverview VerseDetailClient — Tabbed Verse Detail + Reflection Journal
 *
 * Tabs:
 *   Overview  — Arabic text · translation (typed in) · audio player
 *   Tafsir    — Ibn Kathir commentary (expandable)
 *   Reflect   — AI reflection questions + personal journal
 *   Chat      — "Talk to this Verse" streaming AI chat
 *
 * Persistence (localStorage; when signed in, mirrored to Supabase app_user_storage):
 *   qalb_bookmarks      — { [verseKey]: bookmark object }
 *   qalb_reflections    — { [verseKey]: string[] } → verse_reflections
 *   qalb_notes          — { [verseKey]: { text, savedAt } } → verse_notes
 *   qalb_chat           — { [verseKey]: Message[] } → verse_chat
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BookOpen, Bookmark, ChevronLeft, MessageCircle, Save, ScrollText, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { TRANSLATIONS } from "@/app/read/ReadClient";
import AudioPlayer from "@/components/AudioPlayer";
import VerseChat from "@/components/VerseChat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { stripVerseEndMarker } from "@/lib/arabic-utils";
import { emitJourneyLocalUpdated } from "@/lib/qalb-journey-events";
import { LS_VERSE_CHAT, LS_VERSE_NOTES, LS_VERSE_REFLECTIONS } from "@/lib/qalb-verse-local-keys";
import { cleanTranslationText } from "@/lib/translation-utils";
import { useGamification } from "@/lib/useGamification";
import {
  ACCOUNT_STORAGE_SYNCED_EVENT,
  schedulePushVerseChat,
  schedulePushVerseNotes,
  schedulePushVerseReflections,
} from "@/lib/user-app-sync-bridge";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────────────────────────────────────

const LS_BOOKMARKS = "qalb_bookmarks";
const LS_REFLECTIONS = LS_VERSE_REFLECTIONS;
const LS_NOTES = LS_VERSE_NOTES;
const LS_CHAT = LS_VERSE_CHAT;

// Curated tafsirs available from the Quran Foundation API
const TAFSIRS = [
  { id: 169, name: "Ibn Kathir (Abridged)", author: "Hafiz Ibn Kathir", language: "English" },
  { id: 168, name: "Ma'arif al-Qur'an", author: "Mufti Muhammad Shafi", language: "English" },
  { id: 817, name: "Tazkirul Quran", author: "Maulana Wahiduddin Khan", language: "English" },
  { id: 160, name: "Tafsir Ibn Kathir", author: "Hafiz Ibn Kathir", language: "Urdu" },
  { id: 159, name: "Bayan ul Quran", author: "Dr. Israr Ahmad", language: "Urdu" },
  { id: 157, name: "Fi Zilal al-Quran", author: "Sayyid Qutb", language: "Urdu" },
  { id: 14, name: "Tafsir Ibn Kathir", author: "Hafiz Ibn Kathir", language: "Arabic" },
  { id: 91, name: "Al-Sa'di", author: "Al-Sa'di", language: "Arabic" },
];

function lsGet(key) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (key === LS_REFLECTIONS || key === LS_CHAT) emitJourneyLocalUpdated();
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab config
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview", Icon: BookOpen },
  { id: "tafsir", label: "Tafsir", Icon: ScrollText },
  { id: "reflect", label: "Reflect", Icon: Sparkles },
  { id: "chat", label: "Chat", Icon: MessageCircle },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {string} props.verseKey        - e.g. "2:255"
 * @param {object|null} props.initialData - Server-fetched { verse, tafsir, chapter }
 */
export default function VerseDetailClient({ verseKey, initialData }) {
  const { award } = useGamification();
  const verse = initialData?.verse;
  const tafsir = initialData?.tafsir;
  const chapter = initialData?.chapter;

  const arabicText = stripVerseEndMarker(verse?.text_uthmani ?? "");
  const translation = cleanTranslationText(verse?.translations?.[0]?.text?.replace(/<[^>]*>/g, "") ?? "");
  const tafsirHtml = tafsir?.text ?? "";
  const chapterName = chapter?.name_simple ?? verseKey.split(":")[0];

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview");

  // ── Bookmark ───────────────────────────────────────────────────────────────
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const stored = lsGet(LS_BOOKMARKS) ?? {};
    setIsBookmarked(!!stored[verseKey]);
  }, [verseKey]);

  const handleToggleBookmark = useCallback(() => {
    const stored = lsGet(LS_BOOKMARKS) ?? {};
    if (stored[verseKey]) {
      delete stored[verseKey];
      lsSet(LS_BOOKMARKS, stored);
      setIsBookmarked(false);
      toast("Bookmark removed.");
    } else {
      stored[verseKey] = {
        verseKey,
        chapterName,
        arabicText,
        translation: translation || activeTranslationRef.current,
        bookmarkedAt: new Date().toISOString(),
      };
      lsSet(LS_BOOKMARKS, stored);
      setIsBookmarked(true);
      toast.success("Verse bookmarked!");
    }
  }, [verseKey, chapterName, arabicText, translation]);

  // ── Translation with typing effect ────────────────────────────────────────
  const [activeTranslation, setActiveTranslation] = useState(translation);
  const activeTranslationRef = useRef(translation);
  const [displayedTranslation, setDisplayedTranslation] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef(null);
  const [translationId, setTranslationId] = useState(20);
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);
  const [isFetchingTranslation, setIsFetchingTranslation] = useState(false);

  // On mount: if server didn't return a translation, fetch client-side
  useEffect(() => {
    if (activeTranslation) return;
    setIsFetchingTranslation(true);
    fetch(`/api/verse/by-key?key=${verseKey}&translation=20`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const text = cleanTranslationText(data?.verse?.translations?.[0]?.text?.replace(/<[^>]*>/g, "") ?? "");
        if (text) {
          setActiveTranslation(text);
          activeTranslationRef.current = text;
        }
      })
      .catch(() => {})
      .finally(() => setIsFetchingTranslation(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Typing animation — 2 chars / 20ms ≈ 100 chars/sec
  useEffect(() => {
    if (!activeTranslation) return;
    activeTranslationRef.current = activeTranslation;
    clearInterval(typingTimerRef.current);
    setDisplayedTranslation("");
    setIsTyping(true);
    let i = 0;
    typingTimerRef.current = setInterval(() => {
      i += 2;
      setDisplayedTranslation(activeTranslation.slice(0, i));
      if (i >= activeTranslation.length) {
        clearInterval(typingTimerRef.current);
        setDisplayedTranslation(activeTranslation);
        setIsTyping(false);
      }
    }, 20);
    return () => clearInterval(typingTimerRef.current);
  }, [activeTranslation]);

  async function handleChangeTranslation(tid) {
    setShowTranslationPicker(false);
    if (tid === translationId) return;
    setTranslationId(tid);
    setIsFetchingTranslation(true);
    try {
      const res = await fetch(`/api/verse/by-key?key=${verseKey}&translation=${tid}`);
      if (res.ok) {
        const data = await res.json();
        const text = cleanTranslationText(data.verse?.translations?.[0]?.text?.replace(/<[^>]*>/g, "") ?? "");
        if (text) setActiveTranslation(text);
      }
    } catch {
      // keep old translation
    } finally {
      setIsFetchingTranslation(false);
    }
  }

  // ── Tafsir switcher ────────────────────────────────────────────────────────
  const [tafsirId, setTafsirId] = useState(169);
  const [activeTafsirHtml, setActiveTafsirHtml] = useState(tafsirHtml);
  const [isFetchingTafsir, setIsFetchingTafsir] = useState(false);
  const [showTafsirPicker, setShowTafsirPicker] = useState(false);
  const [tafsirExpanded, setTafsirExpanded] = useState(false);

  async function handleChangeTafsir(tid) {
    setShowTafsirPicker(false);
    if (tid === tafsirId) return;
    setTafsirId(tid);
    setTafsirExpanded(false);
    setIsFetchingTafsir(true);
    try {
      const res = await fetch(`/api/verse/tafsir?key=${verseKey}&tafsirId=${tid}`);
      if (res.ok) {
        const data = await res.json();
        setActiveTafsirHtml(data?.tafsir?.text ?? "");
      }
    } catch {
      // keep old tafsir
    } finally {
      setIsFetchingTafsir(false);
    }
  }

  // ── Chat history ────────────────────────────────────────────────────────────
  const [chatHistory, setChatHistory] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_CHAT) ?? "null");
      return stored?.[verseKey] ?? [];
    } catch {
      return [];
    }
  });

  function handleChatHistoryChange(messages) {
    setChatHistory(messages);
    try {
      const stored = JSON.parse(localStorage.getItem(LS_CHAT) ?? "{}") ?? {};
      stored[verseKey] = messages;
      localStorage.setItem(LS_CHAT, JSON.stringify(stored));
      schedulePushVerseChat();
      emitJourneyLocalUpdated();
    } catch {}
  }

  useEffect(() => {
    function reloadFromStorage() {
      try {
        const chatStored = JSON.parse(localStorage.getItem(LS_CHAT) ?? "null");
        setChatHistory(Array.isArray(chatStored?.[verseKey]) ? chatStored[verseKey] : []);
      } catch {
        /* ignore */
      }
      const refStored = lsGet(LS_REFLECTIONS) ?? {};
      if (Array.isArray(refStored[verseKey]) && refStored[verseKey].length > 0) {
        setReflectionQuestions(refStored[verseKey]);
      }
      const noteStored = lsGet(LS_NOTES) ?? {};
      if (noteStored[verseKey]) setSavedNote(noteStored[verseKey]);
    }
    window.addEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, reloadFromStorage);
    return () => window.removeEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, reloadFromStorage);
  }, [verseKey]);

  // ── Reflection questions ───────────────────────────────────────────────────
  const [reflectionQuestions, setReflectionQuestions] = useState([]);
  const [loadingReflections, setLoadingReflections] = useState(false);

  // Load persisted questions on mount
  useEffect(() => {
    const stored = lsGet(LS_REFLECTIONS) ?? {};
    if (stored[verseKey]?.length) setReflectionQuestions(stored[verseKey]);
  }, [verseKey]);

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
          tafsirSnippet: tafsirHtml
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 400),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const { questions } = await res.json();
      setReflectionQuestions(questions);
      award("generate_reflection");
      // Persist
      const stored = lsGet(LS_REFLECTIONS) ?? {};
      stored[verseKey] = questions;
      lsSet(LS_REFLECTIONS, stored);
      schedulePushVerseReflections();
    } catch {
      toast.error("Could not generate reflection prompts. Please try again.");
    } finally {
      setLoadingReflections(false);
    }
  }, [loadingReflections, reflectionQuestions, verseKey, arabicText, translation, tafsirHtml]);

  // ── Personal note ──────────────────────────────────────────────────────────
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [savedNote, setSavedNote] = useState(null);

  // Load persisted note on mount
  useEffect(() => {
    const stored = lsGet(LS_NOTES) ?? {};
    if (stored[verseKey]) setSavedNote(stored[verseKey]);
  }, [verseKey]);

  const handleSaveNote = useCallback(async () => {
    if (!noteText.trim()) {
      toast.error("Please write something before saving.");
      return;
    }
    setIsSavingNote(true);
    try {
      const note = { text: noteText.trim(), savedAt: new Date().toISOString() };
      // Persist locally
      const stored = lsGet(LS_NOTES) ?? {};
      stored[verseKey] = note;
      lsSet(LS_NOTES, stored);
      setSavedNote(note);
      schedulePushVerseNotes();
      toast.success("Reflection saved.");
      award("save_note");
    } finally {
      setIsSavingNote(false);
    }
  }, [noteText, verseKey]);

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!verse) {
    return (
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-12 text-center">
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

  // ── Derived for language picker ────────────────────────────────────────────
  const activeLang = TRANSLATIONS.find((t) => t.id === translationId)?.language ?? "English";
  const isRtl = ["Urdu", "Arabic"].includes(activeLang);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 pb-24">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/30 -mx-4 md:-mx-8 px-4 md:px-8 pt-3 pb-0">
        {/* Back + bookmark row */}
        <div className="flex items-center justify-between mb-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={14} />
            Back
          </Link>

          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-xs font-semibold text-foreground leading-tight">{chapterName}</p>
              <p className="text-[10px] text-muted-foreground">Verse {verseKey.split(":")[1]}</p>
            </div>
            <button
              onClick={handleToggleBookmark}
              aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this verse"}
              className={cn(
                "p-1.5 rounded-lg border transition-all duration-200",
                isBookmarked
                  ? "border-accent/60 bg-accent/15 text-accent"
                  : "border-border/50 bg-muted/30 text-muted-foreground hover:border-accent/40 hover:text-accent",
              )}
            >
              <Bookmark size={14} className={isBookmarked ? "fill-accent" : ""} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0" role="tablist">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all duration-150 whitespace-nowrap",
                activeTab === id
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Overview ───────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-5 pt-5">
          {/* Arabic */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 overflow-hidden">
            <p className="arabic-text arabic-text-display text-foreground/90 text-center" lang="ar" dir="rtl">
              {arabicText}
            </p>
          </div>

          {/* Translation + language picker */}
          <div className="space-y-2 px-1">
            <p
              dir={isRtl ? "rtl" : "ltr"}
              lang={isRtl ? "ur" : undefined}
              className={cn(
                "reading-prose text-foreground/80 transition-opacity duration-200",
                isFetchingTranslation && "opacity-40",
                isRtl && "font-[system-ui] text-right",
              )}
            >
              {isFetchingTranslation ? (
                <span className="text-muted-foreground/40 italic">Loading translation…</span>
              ) : displayedTranslation ? (
                <>
                  {displayedTranslation}
                  {isTyping && (
                    <span className="inline-block w-[2px] h-[1em] bg-accent ml-[1px] align-middle animate-[blink_0.7s_step-end_infinite]" />
                  )}
                </>
              ) : (
                <span className="text-muted-foreground/40 italic">Translation loading…</span>
              )}
            </p>

            {/* Language picker */}
            <div className="relative flex justify-end">
              <button
                onClick={() => setShowTranslationPicker((v) => !v)}
                className="text-[10px] text-muted-foreground/60 hover:text-accent transition-colors flex items-center gap-1"
              >
                {TRANSLATIONS.find((t) => t.id === translationId)?.name ?? "Translation"}
                <span className="opacity-50">▾</span>
              </button>
              {showTranslationPicker && (
                <div className="absolute right-0 top-6 z-50 w-64 rounded-xl border border-border/60 bg-card shadow-xl p-2 space-y-0.5">
                  {TRANSLATIONS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleChangeTranslation(t.id)}
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

          {/* Audio */}
          <AudioPlayer verseKey={verseKey} />
        </div>
      )}

      {/* ── Tab: Tafsir ─────────────────────────────────────────────────── */}
      {activeTab === "tafsir" && (
        <div className="pt-5">
          {/* Tafsir header: title + source picker */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ScrollText size={14} className="text-accent" />
              {TAFSIRS.find((t) => t.id === tafsirId)?.name ?? "Commentary"}
            </h2>
            <div className="flex items-center gap-3">
              {activeTafsirHtml && (
                <button
                  onClick={() => setTafsirExpanded((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {tafsirExpanded ? "Collapse" : "Expand"}
                </button>
              )}
              {/* Source picker */}
              <div className="relative">
                <button
                  onClick={() => setShowTafsirPicker((v) => !v)}
                  className="text-[10px] text-muted-foreground/60 hover:text-accent transition-colors flex items-center gap-1"
                >
                  {TAFSIRS.find((t) => t.id === tafsirId)?.language ?? "Source"}
                  <span className="opacity-50">▾</span>
                </button>
                {showTafsirPicker && (
                  <div className="absolute right-0 top-6 z-50 w-72 rounded-xl border border-border/60 bg-card shadow-xl p-2 space-y-0.5">
                    {["English", "Urdu", "Arabic"].map((lang) => (
                      <div key={lang}>
                        <p className="text-[10px] text-muted-foreground/50 px-3 pt-2 pb-1 uppercase tracking-wider">
                          {lang}
                        </p>
                        {TAFSIRS.filter((t) => t.language === lang).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleChangeTafsir(t.id)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-150",
                              t.id === tafsirId
                                ? "bg-accent/15 text-accent font-medium"
                                : "text-foreground/70 hover:bg-muted/60 hover:text-foreground",
                            )}
                          >
                            <span className="font-medium">{t.name}</span>
                            <span className="ml-2 text-muted-foreground/50 text-[10px]">{t.author}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isFetchingTafsir ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 rounded bg-muted/40" style={{ width: `${85 - i * 5}%` }} />
              ))}
            </div>
          ) : activeTafsirHtml ? (
            <>
              <div
                className={`tafsir-content ${tafsirExpanded ? "" : "tafsir-collapsed"}`}
                dangerouslySetInnerHTML={{ __html: activeTafsirHtml }}
              />
              {!tafsirExpanded && (
                <button
                  onClick={() => setTafsirExpanded(true)}
                  className="mt-3 text-xs text-accent hover:text-accent/80 transition-colors"
                >
                  Read full tafsir ↓
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-3xl mb-3">📖</p>
              <p className="text-sm text-muted-foreground">Tafsir not available for this verse.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Reflect ────────────────────────────────────────────────── */}
      {activeTab === "reflect" && (
        <div className="space-y-6 pt-5">
          {/* AI Reflection Questions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles size={14} className="text-accent" />
                Reflection Prompts
              </h2>
              {reflectionQuestions.length > 0 && (
                <button
                  onClick={() => {
                    setReflectionQuestions([]);
                    const stored = lsGet(LS_REFLECTIONS) ?? {};
                    delete stored[verseKey];
                    lsSet(LS_REFLECTIONS, stored);
                  }}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Regenerate
                </button>
              )}
            </div>

            {reflectionQuestions.length > 0 ? (
              <ul className="space-y-3">
                {reflectionQuestions.map((question, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-primary/5 border border-primary/15"
                  >
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
                  <span className="animate-pulse">Generating…</span>
                ) : (
                  <>
                    <Sparkles size={12} className="mr-1.5 text-accent" />
                    Generate Personal Reflection Questions
                  </>
                )}
              </Button>
            )}
          </section>

          {/* Divider */}
          <div className="border-t border-border/30" />

          {/* Personal Journal */}
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-3">My Reflection</h2>

            {savedNote ? (
              <div className="p-4 rounded-xl bg-card border border-border/50 space-y-2">
                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{savedNote.text}</p>
                <p className="text-[10px] text-muted-foreground">
                  Saved {new Date(savedNote.savedAt).toLocaleDateString()}
                </p>
                <button
                  onClick={() => {
                    setNoteText(savedNote.text);
                    setSavedNote(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  placeholder="Write your personal reflection on this verse…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="min-h-[100px] resize-none bg-card border-border/60 text-sm leading-relaxed"
                  maxLength={2000}
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
                    {isSavingNote ? "Saving…" : "Save Reflection"}
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Tab: Chat ───────────────────────────────────────────────────── */}
      {activeTab === "chat" && (
        <div className="pt-5">
          <VerseChat
            inline
            initialMessages={chatHistory}
            onHistoryChange={handleChatHistoryChange}
            verseKey={verseKey}
            arabicText={arabicText}
            translation={translation}
            tafsirText={tafsirHtml
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim()}
            chapterName={chapterName}
          />
        </div>
      )}
    </div>
  );
}
