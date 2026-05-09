import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft } from "lucide-react";
import HadithChaptersList from "@/components/HadithChaptersList";

import { getHadithChaptersForBook } from "@/lib/hadith-catalog";

export async function generateMetadata({ params }) {
  const p = await Promise.resolve(params);
  const data = getHadithChaptersForBook(p.book);
  return {
    title: data ? `${data.name} · Chapters · Qalb` : "Ahadith · Qalb",
  };
}

export default async function AhadithBookPage({ params }) {
  const p = await Promise.resolve(params);
  const data = getHadithChaptersForBook(p.book);
  if (!data) notFound();

  return (
    <div className="pb-24 md:pb-12">
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
          <span className="text-foreground font-medium truncate">{data.name}</span>
        </div>

        <Link
          href="/ahadith"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All books
        </Link>

        <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-2">{data.name}</h1>
        <p className="text-sm text-muted-foreground mb-6">Select a chapter to read the ahadith in that section.</p>

        <HadithChaptersList bookSlug={p.book} chapters={data.chapters} />
      </div>
    </div>
  );
}
