"use client";

import { useEffect } from "react";

import { LS_LAST_HADITH_READS, mergeHadithVisit } from "@/lib/last-hadith-reads";

/**
 * Record this section as a recent read (client-side) for home “Hadith” strip.
 * @param {{ book: string; section: string; bookName: string; sectionTitle: string }} props
 */
export default function TrackHadithRead({ book, section, bookName, sectionTitle }) {
  useEffect(() => {
    try {
      const href = `/ahadith/${book}/${section}`;
      const existing = JSON.parse(localStorage.getItem(LS_LAST_HADITH_READS) ?? "[]");
      const list = Array.isArray(existing) ? existing : [];
      const entry = {
        href,
        label: sectionTitle ?? `Section ${section}`,
        sub: bookName ?? book,
      };
      const merged = mergeHadithVisit(list, entry);
      localStorage.setItem(LS_LAST_HADITH_READS, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent("qalb-hadith-reads-changed"));
    } catch {
      /* ignore */
    }
  }, [book, section, bookName, sectionTitle]);

  return null;
}
