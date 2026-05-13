import { ArrowLeft, BookMarked } from "lucide-react";
import Link from "next/link";

import HadithBooksList from "@/components/HadithBooksList";
import { listHadithBooks } from "@/lib/hadith-catalog";

export const metadata = {
  title: "Read Ahadith · Qalb",
  description:
    "Browse Sahih Bukhari, Muslim, Sunan an-Nasa'i, Muwatta Malik, and more — by book, chapter, and narration.",
};

export default function AhadithPage() {
  const books = listHadithBooks();

  return (
    <div className="pb-24 md:pb-12">
      <div className="mx-auto max-w-5xl px-4 md:px-8 pt-6 md:pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to home
        </Link>

        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-accent mb-2">
              <BookMarked className="h-5 w-5" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wider">Hadith library</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">Read Ahadith</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              Choose a collection, then a chapter (bab), then read the narrations. English text from the{" "}
              <a
                href="https://github.com/fawazahmed0/hadith-api"
                className="text-accent hover:underline underline-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                hadith-api
              </a>{" "}
              corpus — the same structure can later tie into bookmarks, search, and your Quran journey.
            </p>
          </div>
        </header>

        <HadithBooksList books={books} />
      </div>
    </div>
  );
}
