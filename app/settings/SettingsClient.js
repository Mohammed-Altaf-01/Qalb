"use client";

import Link from "next/link";

import { ALargeSmall, BookMarked, ChevronRight, Palette, Target, User } from "lucide-react";

import ReadingScaleControl from "@/components/ReadingScaleControl";
import ThemeToggle from "@/components/ThemeToggle";

function SettingsRow({ icon: Icon, title, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4 border-b border-border/30 last:border-0">
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 border border-accent/20">
          <Icon size={16} className="text-accent" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="shrink-0 sm:pl-4">{children}</div>
    </div>
  );
}

export default function SettingsClient() {
  return (
    <div className="mx-auto max-w-lg px-4 md:px-8 py-6 md:py-10 pb-28 md:pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Appearance and reading options apply across the app.</p>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/40 px-4 md:px-5 mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80 pt-4 pb-1">
          Appearance
        </p>
        <SettingsRow
          icon={Palette}
          title="Theme"
          description="Light or dark mode for the whole app."
          children={<ThemeToggle />}
        />
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/40 px-4 md:px-5 mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80 pt-4 pb-1">Reading</p>
        <SettingsRow
          icon={ALargeSmall}
          title="Text size"
          description="Qur’an Arabic, translations, hadith, and tafsir scale together."
          children={<ReadingScaleControl />}
        />
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80 px-4 md:px-5 pt-4 pb-2">
          More
        </p>
        <Link
          href="/library"
          className="flex items-center justify-between gap-3 px-4 md:px-5 py-3.5 border-t border-border/25 hover:bg-primary/5 transition-colors"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-foreground">
            <BookMarked size={16} className="text-muted-foreground shrink-0" aria-hidden />
            Library
          </span>
          <ChevronRight size={16} className="text-muted-foreground/50 shrink-0" aria-hidden />
        </Link>
        <Link
          href="/goals"
          className="flex items-center justify-between gap-3 px-4 md:px-5 py-3.5 border-t border-border/25 hover:bg-primary/5 transition-colors"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-foreground">
            <Target size={16} className="text-muted-foreground shrink-0" aria-hidden />
            Goals
          </span>
          <ChevronRight size={16} className="text-muted-foreground/50 shrink-0" aria-hidden />
        </Link>
        <Link
          href="/profile"
          className="flex items-center justify-between gap-3 px-4 md:px-5 py-3.5 border-t border-border/25 hover:bg-primary/5 transition-colors"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-foreground">
            <User size={16} className="text-muted-foreground shrink-0" aria-hidden />
            Profile & account
          </span>
          <ChevronRight size={16} className="text-muted-foreground/50 shrink-0" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
