import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import TrackHadithRead from "@/components/TrackHadithRead";
import {
  attachArabicToHadiths,
  fetchHadithSection,
  getHadithChaptersForBook,
  splitHadithSanad,
} from "@/lib/hadith-catalog";

export async function generateMetadata({ params }) {
  const p = await Promise.resolve(params);
  const edition = `eng-${p.book}`;
  const data = await fetchHadithSection(edition, p.section);
  const title = data?.metadata?.section?.[p.section] ?? `Section ${p.section}`;
  const bookData = getHadithChaptersForBook(p.book);
  return {
    title: bookData ? `${title} · ${bookData.name} · Qalb` : "Ahadith · Qalb",
  };
}

export default async function AhadithSectionPage({ params }) {
  const p = await Promise.resolve(params);
  const bookData = getHadithChaptersForBook(p.book);
  if (!bookData) notFound();

  const editionEn = `eng-${p.book}`;
  const editionAr = `ara-${p.book}`;
  const [payloadEn, payloadAr] = await Promise.all([
    fetchHadithSection(editionEn, p.section),
    fetchHadithSection(editionAr, p.section),
  ]);
  if (!payloadEn?.hadiths?.length) notFound();

  const hadiths = attachArabicToHadiths(payloadEn.hadiths, payloadAr);

  const sectionTitle =
    payloadEn.metadata?.section?.[p.section] ?? bookData.chapters.find((c) => c.id === p.section)?.title ?? "Chapter";

  return (
    <div className="pb-24 md:pb-12">
      <TrackHadithRead book={p.book} section={String(p.section)} bookName={bookData.name} sectionTitle={sectionTitle} />
      <div className="mx-auto max-w-3xl px-4 md:px-8 pt-6 md:pt-8">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link href="/ahadith" className="hover:text-foreground transition-colors">
            Ahadith
          </Link>
          <span aria-hidden>/</span>
          <Link href={`/ahadith/${p.book}`} className="hover:text-foreground transition-colors truncate max-w-[10rem]">
            {bookData.name}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground font-medium truncate max-w-[12rem]">{sectionTitle}</span>
        </div>

        <Link
          href={`/ahadith/${p.book}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Chapters
        </Link>

        <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight mb-1">{sectionTitle}</h1>
        <p className="text-xs text-muted-foreground mb-6">
          {bookData.name} · section {p.section}
        </p>

        <ol className="space-y-4">
          {hadiths.map((h) => {
            const english = splitHadithSanad(h.text, "en");
            const arabic = splitHadithSanad(h.textArabic, "ar");
            return (
              <li
                key={`${h.hadithnumber}-${h.reference?.hadith ?? ""}`}
                className="rounded-2xl border border-border/35 bg-card/25 px-4 py-4 md:px-5"
              >
                <p className="text-[11px] font-semibold text-accent/90 mb-2 tabular-nums">Hadith {h.hadithnumber}</p>
                {arabic.sanad ? (
                  <p className="arabic-text text-foreground/55 mb-2 text-right text-base" lang="ar" dir="rtl">
                    {arabic.sanad}
                  </p>
                ) : null}
                {h.textArabic ? (
                  <p className="arabic-text arabic-text-display text-foreground/90 mb-4 text-right" lang="ar" dir="rtl">
                    {arabic.body}
                  </p>
                ) : null}
                {english.sanad ? <p className="text-sm text-foreground/55 mb-2 italic">{english.sanad}</p> : null}
                <p className="reading-prose text-foreground/95">{english.body}</p>
                {h.grades?.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">Grade: {h.grades.join(", ")}</p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
