"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { loadHifzPrefs, saveHifzPrefs } from "@/lib/hifz-prefs";
import { buildRevisionQueue, countDueCards, mergeKeysIntoDeck } from "@/lib/hifz-queue";
import { expandSelectionToVerseKeys } from "@/lib/hifz-selection";
import { toLocalDayKey } from "@/lib/local-calendar-day";
import { GRADES, scheduleReview } from "@/lib/spaced-repetition";
import { LS_HIFZ_PROGRESS_KEY } from "@/lib/qalb-storage-keys";
import { ACCOUNT_STORAGE_SYNCED_EVENT, schedulePushHifzProgress } from "@/lib/user-app-sync-bridge";
import { cn } from "@/lib/utils";

const MODE_LABELS = {
  surah: "Whole surah",
  surahRange: "Surah range",
  page: "Mushaf page",
  ayahRange: "Ayah range",
};

/**
 * @param {{ chapters: Array<{ id: number, name_simple?: string, verses_count: number }> }} props
 */
export default function HifzClient({ chapters = [] }) {
  const [tab, setTab] = useState("practice");
  const [cards, setCards] = useState({});
  const [prefs, setPrefs] = useState(() => loadHifzPrefs());
  const [key, setKey] = useState("1:1");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");

  const [revIndex, setRevIndex] = useState(0);
  const [revRevealed, setRevRevealed] = useState(false);
  const [revAudioUrl, setRevAudioUrl] = useState("");

  const today = toLocalDayKey();

  const loadCardsFromStorage = useCallback(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_HIFZ_PROGRESS_KEY) ?? "{}");
      setCards(raw && typeof raw === "object" ? raw : {});
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadCardsFromStorage();
    window.addEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, loadCardsFromStorage);
    return () => window.removeEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, loadCardsFromStorage);
  }, [loadCardsFromStorage]);

  const persist = useCallback((next) => {
    localStorage.setItem(LS_HIFZ_PROGRESS_KEY, JSON.stringify(next));
    setCards(next);
    schedulePushHifzProgress();
  }, []);

  const updatePrefs = useCallback((patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      saveHifzPrefs(next);
      return next;
    });
  }, []);

  const revisionQueue = useMemo(() => buildRevisionQueue(cards, today), [cards, today]);
  const dueCount = useMemo(() => countDueCards(cards, today), [cards, today]);
  const totalCards = useMemo(() => Object.keys(cards).length, [cards]);

  const revKey = revisionQueue[revIndex] ?? null;

  useEffect(() => {
    if (revIndex >= revisionQueue.length) setRevIndex(0);
  }, [revisionQueue.length, revIndex]);

  useEffect(() => {
    setRevRevealed(false);
    setRevAudioUrl("");
  }, [revKey]);

  const loadAudioForKey = useCallback(async (verseKey, setter) => {
    setter("");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/verse/audio?key=${encodeURIComponent(verseKey.trim())}&reciter=${prefs.reciterId}`,
      );
      const js = await res.json();
      setter(js?.audioUrl ?? "");
    } catch {
      setter("");
    } finally {
      setLoading(false);
    }
  }, [prefs.reciterId]);

  const schedule = useCallback(
    (verseKey, grade, onDone) => {
      const cur = cards[verseKey]?.scheduling ?? {};
      const nextScheduling = scheduleReview(cur, grade, today);
      const next = {
        ...cards,
        [verseKey]: { scheduling: nextScheduling, updatedAt: Date.now() },
      };
      persist(next);
      onDone?.();
    },
    [cards, persist, today],
  );

  const handleAddToDeck = async () => {
    if (!chapters.length) {
      toast.error("Surah list not loaded yet.");
      return;
    }
    setAdding(true);
    try {
      const spec = {
        mode: prefs.mode,
        surahId: prefs.surahId,
        fromSurahId: prefs.fromSurahId,
        toSurahId: prefs.toSurahId,
        mushafPage: prefs.mushafPage,
        startAyah: prefs.startAyah,
        endAyah: prefs.endAyah,
      };
      const { keys, error } = await expandSelectionToVerseKeys(spec, chapters);
      if (error) {
        toast.error(error);
        return;
      }
      const { next, added } = mergeKeysIntoDeck(cards, keys, today);
      persist(next);
      if (added > 0) {
        toast.success(`Added ${added} verse${added === 1 ? "" : "s"} to your deck.`);
        setKey(keys[0] ?? key);
      } else {
        toast.message("All selected verses are already in your deck.");
      }
    } finally {
      setAdding(false);
    }
  };

  const dueSoonPractice = useMemo(() => revisionQueue.slice(0, 5), [revisionQueue]);

  const gradeButtons = (verseKey, onGraded) =>
    [
      ["Again", GRADES.AGAIN],
      ["Hard", GRADES.HARD],
      ["Good", GRADES.GOOD],
      ["Easy", GRADES.EASY],
    ].map(([label, g]) => (
      <button
        key={label}
        type="button"
        onClick={() => schedule(verseKey, g, onGraded)}
        className="text-xs px-3 py-1.5 rounded-full border transition-colors border-border/40 bg-muted/20 hover:bg-accent/15"
      >
        {label}
      </button>
    ));

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl border border-border/40 p-1 bg-muted/20" role="tablist">
        {[
          ["practice", "Practice"],
          ["revision", `Revision${dueCount ? ` (${dueCount})` : ""}`],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 text-xs font-medium py-2 rounded-lg transition-colors",
              tab === id ? "bg-card text-accent shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "practice" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground">Add verses</p>
            <label className="text-[11px] text-muted-foreground flex flex-col gap-1">
              Selection type
              <select
                value={prefs.mode}
                onChange={(e) => updatePrefs({ mode: e.target.value })}
                className="text-sm px-3 py-2 rounded-lg border border-border/50 bg-background"
              >
                {Object.entries(MODE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>

            {prefs.mode === "surah" && (
              <SurahSelect chapters={chapters} value={prefs.surahId} onChange={(id) => updatePrefs({ surahId: id })} />
            )}

            {prefs.mode === "surahRange" && (
              <div className="grid grid-cols-2 gap-2">
                <SurahSelect
                  label="From"
                  chapters={chapters}
                  value={prefs.fromSurahId}
                  onChange={(id) => updatePrefs({ fromSurahId: id })}
                />
                <SurahSelect
                  label="To"
                  chapters={chapters}
                  value={prefs.toSurahId}
                  onChange={(id) => updatePrefs({ toSurahId: id })}
                />
              </div>
            )}

            {prefs.mode === "page" && (
              <label className="text-[11px] text-muted-foreground flex flex-col gap-1">
                Mushaf page (1–604)
                <input
                  type="number"
                  min={1}
                  max={604}
                  value={prefs.mushafPage}
                  onChange={(e) => updatePrefs({ mushafPage: parseInt(e.target.value, 10) || 1 })}
                  className="text-sm px-3 py-2 rounded-lg border border-border/50 bg-background"
                />
              </label>
            )}

            {prefs.mode === "ayahRange" && (
              <div className="space-y-2">
                <SurahSelect chapters={chapters} value={prefs.surahId} onChange={(id) => updatePrefs({ surahId: id })} />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-muted-foreground flex flex-col gap-1">
                    From ayah
                    <input
                      type="number"
                      min={1}
                      value={prefs.startAyah}
                      onChange={(e) => updatePrefs({ startAyah: parseInt(e.target.value, 10) || 1 })}
                      className="text-sm px-3 py-2 rounded-lg border border-border/50 bg-background"
                    />
                  </label>
                  <label className="text-[11px] text-muted-foreground flex flex-col gap-1">
                    To ayah
                    <input
                      type="number"
                      min={1}
                      value={prefs.endAyah}
                      onChange={(e) => updatePrefs({ endAyah: parseInt(e.target.value, 10) || 1 })}
                      className="text-sm px-3 py-2 rounded-lg border border-border/50 bg-background"
                    />
                  </label>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={adding || !chapters.length}
              onClick={() => void handleAddToDeck()}
              className="w-full text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add to deck"}
            </button>
            <p className="text-[10px] text-muted-foreground">Your last selection is saved automatically for next time.</p>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
            <label className="text-xs font-medium text-muted-foreground flex flex-col gap-1">
              Current verse key
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border border-border/50 bg-background"
                placeholder="2:255"
              />
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => void loadAudioForKey(key, setAudioUrl)}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-95"
              >
                Load audio
              </button>
              <Link href={`/verse/${encodeURIComponent(key.trim())}`} className="text-xs text-accent underline">
                Open verse
              </Link>
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-accent" aria-label="loading" /> : null}
            </div>
            {audioUrl ? <audio controls className="w-full mt-2" src={audioUrl} /> : null}
            <p className="text-[11px] text-muted-foreground">Grade recall after listening.</p>
            <div className="flex flex-wrap gap-2">{gradeButtons(key, undefined)}</div>
            <p className="text-[11px] text-muted-foreground">
              Next due: <span className="text-foreground">{cards[key]?.scheduling?.dueDayKey ?? "—"}</span> · interval{" "}
              {cards[key]?.scheduling?.intervalDays ?? "—"}d · reps {cards[key]?.scheduling?.reps ?? "—"}
            </p>
          </div>

          {dueSoonPractice.length > 0 && (
            <div className="rounded-2xl border border-accent/35 bg-accent/5 p-4 space-y-2">
              <p className="text-xs font-semibold text-foreground">Due soon</p>
              <div className="flex flex-wrap gap-1">
                {dueSoonPractice.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKey(k)}
                    className="text-[11px] px-2 py-1 rounded-full border border-border/40 hover:border-accent/50"
                  >
                    {k}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setTab("revision")} className="text-[11px] text-accent underline">
                Open full revision session →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{dueCount}</span> due ·{" "}
            <span className="font-semibold text-foreground">{totalCards}</span> total cards
          </p>

          {revKey ? (
            <>
              <p className="text-[11px] text-muted-foreground">
                Card {revIndex + 1} of {revisionQueue.length}
              </p>
              {revRevealed ? (
                <p className="text-lg font-semibold text-accent text-center py-4">{revKey}</p>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Try to recall the verse, then reveal.</p>
              )}
              <div className="flex flex-wrap gap-2 justify-center">
                {!revRevealed ? (
                  <button
                    type="button"
                    onClick={() => setRevRevealed(true)}
                    className="text-xs px-4 py-2 rounded-lg border border-accent/40 text-accent"
                  >
                    Reveal
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void loadAudioForKey(revKey, setRevAudioUrl)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground"
                    >
                      Play audio
                    </button>
                    {revAudioUrl ? <audio controls className="w-full" src={revAudioUrl} /> : null}
                    <div className="flex flex-wrap gap-2 justify-center w-full pt-2">
                      {gradeButtons(revKey, () => {
                        setRevIndex((i) => i + 1);
                      })}
                    </div>
                  </>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                Due {cards[revKey]?.scheduling?.dueDayKey ?? "—"}
              </p>
            </>
          ) : (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-muted-foreground">Nothing due right now. Add verses in Practice or check back later.</p>
              <button
                type="button"
                onClick={() => setTab("practice")}
                className="text-xs px-4 py-2 rounded-lg border border-border/50"
              >
                Go to Practice
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SurahSelect({ chapters, value, onChange, label = "Surah" }) {
  return (
    <label className="text-[11px] text-muted-foreground flex flex-col gap-1">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="text-sm px-3 py-2 rounded-lg border border-border/50 bg-background"
      >
        {chapters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.id}. {c.name_simple ?? `Surah ${c.id}`}
          </option>
        ))}
      </select>
    </label>
  );
}
