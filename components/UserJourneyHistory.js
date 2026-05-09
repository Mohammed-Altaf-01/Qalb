"use client";

import { useEffect, useMemo, useState } from "react";

import { BookOpen, MessageCircle, ScrollText, Sparkles } from "lucide-react";
import Link from "next/link";

import { JOURNEY_LOCAL_UPDATED_EVENT } from "@/lib/qalb-journey-events";
import { LS_DISCOVER_HISTORY } from "@/lib/qalb-discover-history";
import { LS_READ_KEY_THEMES } from "@/lib/qalb-storage-keys";
import { LS_VERSE_CHAT, LS_VERSE_REFLECTIONS } from "@/lib/qalb-verse-local-keys";
import { ACCOUNT_STORAGE_SYNCED_EVENT } from "@/lib/user-app-sync-bridge";
import { cn } from "@/lib/utils";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function Section({ icon: Icon, title, children, className }) {
  return (
    <section className={cn("rounded-2xl border border-border/35 bg-card/30 p-4 space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-accent shrink-0" aria-hidden />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function UserJourneyHistory() {
  const [, bump] = useState(0);

  useEffect(() => {
    function reload() {
      bump((n) => n + 1);
    }
    window.addEventListener("storage", reload);
    window.addEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, reload);
    window.addEventListener(JOURNEY_LOCAL_UPDATED_EVENT, reload);
    function onVisible() {
      if (document.visibilityState === "visible") reload();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("storage", reload);
      window.removeEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, reload);
      window.removeEventListener(JOURNEY_LOCAL_UPDATED_EVENT, reload);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const keyThemes = useMemo(() => {
    const doc = readJson(LS_READ_KEY_THEMES, {});
    const map = doc?.themesBySurahId && typeof doc.themesBySurahId === "object" ? doc.themesBySurahId : {};
    return Object.entries(map)
      .map(([surahId, row]) => ({
        surahId,
        surahName: typeof row?.surahName === "string" ? row.surahName : `Surah ${surahId}`,
        updatedAt: typeof row?.updatedAt === "number" ? row.updatedAt : 0,
        hasMarkdown: typeof row?.markdown === "string" && row.markdown.length > 0,
      }))
      .filter((r) => r.hasMarkdown)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 12);
  }, [bump]);

  const discovers = useMemo(() => {
    const list = readJson(LS_DISCOVER_HISTORY, []);
    return Array.isArray(list) ? list.slice(0, 15) : [];
  }, [bump]);

  const reflections = useMemo(() => {
    const obj = readJson(LS_VERSE_REFLECTIONS, {});
    if (!obj || typeof obj !== "object") return [];
    return Object.entries(obj)
      .filter(([, v]) => Array.isArray(v) && v.length > 0)
      .map(([verseKey]) => ({ verseKey }))
      .slice(0, 20);
  }, [bump]);

  const chats = useMemo(() => {
    const obj = readJson(LS_VERSE_CHAT, {});
    if (!obj || typeof obj !== "object") return [];
    return Object.entries(obj)
      .filter(([, msgs]) => Array.isArray(msgs) && msgs.length > 0)
      .map(([verseKey]) => ({ verseKey }))
      .slice(0, 20);
  }, [bump]);

  const empty =
    keyThemes.length === 0 && discovers.length === 0 && reflections.length === 0 && chats.length === 0;

  if (empty) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/25 px-4 py-10 text-center space-y-3">
        <p className="text-sm font-medium text-foreground">No history yet</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          When you finish generating{" "}
          <span className="text-foreground/90">Key themes</span> on Read, complete a{" "}
          <span className="text-foreground/90">Discover</span> search, or finish{" "}
          <span className="text-foreground/90">Reflect</span> or <span className="text-foreground/90">Chat</span> on a verse,
          your entries will show up here automatically.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-2">
          <Link
            href="/read"
            className="text-xs font-medium text-accent border border-accent/30 rounded-lg px-3 py-1.5 hover:bg-accent/10"
          >
            Read Quran
          </Link>
          <Link
            href="/discover"
            className="text-xs font-medium text-accent border border-accent/30 rounded-lg px-3 py-1.5 hover:bg-accent/10"
          >
            Discover
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-muted-foreground border border-border/40 rounded-lg px-3 py-1.5 hover:bg-muted/30 hover:text-foreground"
          >
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {keyThemes.length > 0 && (
        <Section icon={Sparkles} title="Key themes (reading)">
          <ul className="space-y-2">
            {keyThemes.map((t) => (
              <li key={t.surahId}>
                <Link
                  href={`/read/key-themes/${encodeURIComponent(t.surahId)}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/30 bg-background/30 px-3 py-2 text-left hover:border-accent/35 hover:bg-accent/5 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground truncate">{t.surahName}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">View themes</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {discovers.length > 0 && (
        <Section icon={BookOpen} title="Discover">
          <ul className="space-y-2">
            {discovers.map((d, i) => (
              <li
                key={`${d.at ?? i}-${d.situationSnippet?.slice(0, 20)}`}
                className="rounded-xl border border-border/30 bg-background/30 px-3 py-2"
              >
                <p className="text-xs text-foreground/85 line-clamp-2">{d.situationSnippet}</p>
                {Array.isArray(d.verseKeys) && d.verseKeys.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.verseKeys.map((k) => (
                      <Link
                        key={k}
                        href={`/verse/${k}`}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-accent/25 text-accent hover:bg-accent/10"
                      >
                        {k}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Link href="/discover" className="inline-block text-[11px] font-medium text-accent hover:underline">
            New search →
          </Link>
        </Section>
      )}

      {reflections.length > 0 && (
        <Section icon={ScrollText} title="Reflect">
          <ul className="flex flex-wrap gap-2">
            {reflections.map(({ verseKey }) => (
              <li key={verseKey}>
                <Link
                  href={`/verse/${verseKey}`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-border/40 bg-background/30 text-foreground hover:border-accent/35"
                >
                  {verseKey}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {chats.length > 0 && (
        <Section icon={MessageCircle} title="Verse chat">
          <ul className="flex flex-wrap gap-2">
            {chats.map(({ verseKey }) => (
              <li key={verseKey}>
                <Link
                  href={`/verse/${verseKey}`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-border/40 bg-background/30 text-foreground hover:border-accent/35"
                >
                  {verseKey}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
