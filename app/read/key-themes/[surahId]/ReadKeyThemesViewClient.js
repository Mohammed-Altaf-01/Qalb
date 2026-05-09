"use client";

import { useEffect, useMemo, useState } from "react";

import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { JOURNEY_LOCAL_UPDATED_EVENT } from "@/lib/qalb-journey-events";
import { LS_READ_KEY_THEMES } from "@/lib/qalb-storage-keys";
import { ACCOUNT_STORAGE_SYNCED_EVENT } from "@/lib/user-app-sync-bridge";

/**
 * @param {{ surahId: number }} props
 */
export default function ReadKeyThemesViewClient({ surahId }) {
  const [, bump] = useState(0);

  useEffect(() => {
    function reload() {
      bump((x) => x + 1);
    }
    window.addEventListener(JOURNEY_LOCAL_UPDATED_EVENT, reload);
    window.addEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, reload);
    return () => {
      window.removeEventListener(JOURNEY_LOCAL_UPDATED_EVENT, reload);
      window.removeEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, reload);
    };
  }, []);

  const row = useMemo(() => {
    try {
      const raw = localStorage.getItem(LS_READ_KEY_THEMES) ?? "{}";
      const doc = JSON.parse(raw);
      const r = doc?.themesBySurahId?.[String(surahId)];
      if (r && typeof r.markdown === "string" && r.markdown.length > 0) {
        return {
          markdown: r.markdown,
          surahName:
            typeof r.surahName === "string" && r.surahName.trim() ? r.surahName.trim() : `Surah ${surahId}`,
        };
      }
    } catch {
      /* ignore */
    }
    return null;
  }, [surahId, bump]);

  const readHref = `/read?surah=${surahId}`;

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-6 pb-24 md:pb-12 space-y-6">
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <Link href="/journey" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Journey
        </Link>
        <span aria-hidden className="text-border">·</span>
        <Link href="/read" className="hover:text-foreground transition-colors">
          Read
        </Link>
      </div>

      <header className="space-y-2">
        <div className="flex items-center gap-2 text-accent">
          <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider">Key themes</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
          {row?.surahName ?? `Surah ${surahId}`}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Saved summary from when you generated themes on the reader. Open the surah anytime to refresh or keep reading.
        </p>
      </header>

      {row ? (
        <article className="rounded-2xl border border-border/35 bg-card/30 p-4 md:p-6">
          <div className="chat-markdown text-sm leading-relaxed text-foreground/85 break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{row.markdown}</ReactMarkdown>
          </div>
        </article>
      ) : (
        <div className="rounded-2xl border border-border/30 bg-card/25 px-4 py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            There isn&apos;t a saved key theme for this surah on this device yet. Generate one from Read, or sign in and
            sync if you saved it elsewhere.
          </p>
        </div>
      )}

      <div>
        <Link href={readHref}>
          <Button className="w-full sm:w-auto inline-flex items-center justify-center gap-2">
            <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
            Continue reading
          </Button>
        </Link>
      </div>
    </div>
  );
}
