"use client";

import { useMemo, useState } from "react";

import { BookOpen, ChevronRight, Search, X } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Static Data — Juz 1–30
// ─────────────────────────────────────────────────────────────────────────────

const JUZ_DATA = [
  { number: 1, arabicName: "الم", name: "Alif Lam Mim", startSurah: 1, surahs: "Al-Fatiha – Al-Baqarah 141" },
  { number: 2, arabicName: "سَيَقُولُ", name: "Sayaqul", startSurah: 2, surahs: "Al-Baqarah 142–252" },
  {
    number: 3,
    arabicName: "تِلْكَ الرُّسُلُ",
    name: "Tilkar Rusul",
    startSurah: 2,
    surahs: "Al-Baqarah 253 – Ali 'Imran 92",
  },
  { number: 4, arabicName: "لَنْ تَنَالُوا", name: "Lan Tana Lu", startSurah: 3, surahs: "Ali 'Imran 93 – An-Nisa 23" },
  { number: 5, arabicName: "وَالْمُحْصَنَاتُ", name: "Wal Muhsanat", startSurah: 4, surahs: "An-Nisa 24–147" },
  {
    number: 6,
    arabicName: "لَا يُحِبُّ",
    name: "La Yuhibbullah",
    startSurah: 4,
    surahs: "An-Nisa 148 – Al-Ma'idah 82",
  },
  {
    number: 7,
    arabicName: "وَإِذَا سَمِعُوا",
    name: "Wa Idha Sami'u",
    startSurah: 5,
    surahs: "Al-Ma'idah 83 – Al-An'am 110",
  },
  {
    number: 8,
    arabicName: "وَلَوْ أَنَّنَا",
    name: "Wa Law Annana",
    startSurah: 6,
    surahs: "Al-An'am 111 – Al-A'raf 87",
  },
  { number: 9, arabicName: "قَالَ الْمَلَأُ", name: "Qalalmal'a", startSurah: 7, surahs: "Al-A'raf 88 – Al-Anfal 40" },
  { number: 10, arabicName: "وَاعْلَمُوا", name: "Wa A'lamu", startSurah: 8, surahs: "Al-Anfal 41 – At-Tawbah 92" },
  { number: 11, arabicName: "يَعْتَذِرُونَ", name: "Ya'tadhirun", startSurah: 9, surahs: "At-Tawbah 93 – Hud 5" },
  {
    number: 12,
    arabicName: "وَمَا مِنْ دَابَّةٍ",
    name: "Wa Ma Min Dabbah",
    startSurah: 11,
    surahs: "Hud 6 – Yusuf 52",
  },
  {
    number: 13,
    arabicName: "وَمَا أُبَرِّئُ",
    name: "Wa Ma Ubarri'u",
    startSurah: 12,
    surahs: "Yusuf 53 – Ibrahim 52",
  },
  { number: 14, arabicName: "رُبَمَا", name: "Rubama", startSurah: 15, surahs: "Al-Hijr – An-Nahl 128" },
  {
    number: 15,
    arabicName: "سُبْحَانَ الَّذِي",
    name: "Subhanalladhi",
    startSurah: 17,
    surahs: "Al-Isra – Al-Kahf 74",
  },
  { number: 16, arabicName: "قَالَ أَلَمْ", name: "Qal Alam", startSurah: 18, surahs: "Al-Kahf 75 – Ta-Ha 135" },
  { number: 17, arabicName: "اقْتَرَبَ", name: "Iqtaraba", startSurah: 21, surahs: "Al-Anbya – Al-Hajj 78" },
  { number: 18, arabicName: "قَدْ أَفْلَحَ", name: "Qad Aflaha", startSurah: 23, surahs: "Al-Mu'minun – Al-Furqan 20" },
  {
    number: 19,
    arabicName: "وَقَالَ الَّذِينَ",
    name: "Wa Qalalladhina",
    startSurah: 25,
    surahs: "Al-Furqan 21 – An-Naml 55",
  },
  {
    number: 20,
    arabicName: "أَمَّنْ خَلَقَ",
    name: "Amman Khalaqa",
    startSurah: 27,
    surahs: "An-Naml 56 – Al-'Ankabut 45",
  },
  {
    number: 21,
    arabicName: "اتْلُ مَا أُوحِيَ",
    name: "Utlu Ma Uhiya",
    startSurah: 29,
    surahs: "Al-'Ankabut 46 – Al-Ahzab 30",
  },
  {
    number: 22,
    arabicName: "وَمَنْ يَقْنُتْ",
    name: "Wa Man Yaqnut",
    startSurah: 33,
    surahs: "Al-Ahzab 31 – Ya-Sin 27",
  },
  { number: 23, arabicName: "وَمَا لِيَ", name: "Wa Mali", startSurah: 36, surahs: "Ya-Sin 28 – Az-Zumar 31" },
  {
    number: 24,
    arabicName: "فَمَنْ أَظْلَمُ",
    name: "Faman Azlamu",
    startSurah: 39,
    surahs: "Az-Zumar 32 – Fussilat 46",
  },
  {
    number: 25,
    arabicName: "إِلَيْهِ يُرَدُّ",
    name: "Ilayhi Yuraddu",
    startSurah: 41,
    surahs: "Fussilat 47 – Al-Jathiyah 37",
  },
  { number: 26, arabicName: "حم", name: "Ha Mim", startSurah: 46, surahs: "Al-Ahqaf – Adh-Dhariyat 30" },
  {
    number: 27,
    arabicName: "قَالَ فَمَا خَطْبُكُمْ",
    name: "Qala Fama Khatbukum",
    startSurah: 51,
    surahs: "Adh-Dhariyat 31 – Al-Hadid 29",
  },
  { number: 28, arabicName: "قَدْ سَمِعَ", name: "Qad Sami'a", startSurah: 58, surahs: "Al-Mujadila – At-Tahrim 12" },
  {
    number: 29,
    arabicName: "تَبَارَكَ الَّذِي",
    name: "Tabarakalladhi",
    startSurah: 67,
    surahs: "Al-Mulk – Al-Mursalat 50",
  },
  { number: 30, arabicName: "عَمَّ", name: "Amma", startSurah: 78, surahs: "An-Naba – An-Nas" },
];

// 60 hizbs — each pair belongs to one juz
// Approximate surah starts derived from juz boundaries
const HIZB_DATA = Array.from({ length: 60 }, (_, i) => {
  const hizbNum = i + 1;
  const juzNum = Math.ceil(hizbNum / 2);
  const juz = JUZ_DATA[juzNum - 1];
  return { number: hizbNum, juzNum, startSurah: juz?.startSurah ?? 1 };
});

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Single surah row (quran.com style) */
function SurahRow({ chapter }) {
  return (
    <Link
      href={`/read?surah=${chapter.id}`}
      className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl border border-transparent
        hover:bg-card hover:border-border/40 transition-all duration-150 group"
    >
      {/* Number circle */}
      <div
        className="w-9 h-9 rounded-full border border-accent/30 bg-accent/8 flex items-center
          justify-center shrink-0"
      >
        <span className="text-xs font-semibold text-accent">{chapter.id}</span>
      </div>

      {/* Name block */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
            {chapter.name_simple}
          </span>
          <span className="text-[10px] text-muted-foreground/50 bg-muted/50 px-2 py-0.5 rounded-full capitalize hidden sm:inline">
            {chapter.revelation_place}
          </span>
        </div>
        <span className="text-xs text-muted-foreground/55">{chapter.translated_name?.name}</span>
      </div>

      {/* Arabic name + verse count */}
      <div className="text-right shrink-0">
        <p className="arabic-text text-lg text-foreground/80 leading-none mb-1">{chapter.name_arabic}</p>
        <p className="text-[10px] text-muted-foreground/45">{chapter.verses_count} verses</p>
      </div>

      <ChevronRight
        size={14}
        className="text-muted-foreground/25 group-hover:text-accent/50 transition-colors shrink-0 hidden sm:block"
      />
    </Link>
  );
}

/** Juz card */
function JuzCard({ juz }) {
  return (
    <Link
      href={`/read?surah=${juz.startSurah}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/30 bg-card
        hover:border-accent/40 hover:bg-accent/5 transition-all duration-150 group"
    >
      <div
        className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center
          justify-center shrink-0"
      >
        <span className="text-sm font-bold text-accent">{juz.number}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">
            Juz {juz.number}
          </span>
          <span className="arabic-text text-sm text-accent/70">{juz.arabicName}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/55 truncate">{juz.surahs}</p>
      </div>
      <BookOpen size={13} className="text-muted-foreground/25 group-hover:text-accent/50 transition-colors shrink-0" />
    </Link>
  );
}

/** Hizb card */
function HizbCard({ hizb }) {
  return (
    <Link
      href={`/read?surah=${hizb.startSurah}`}
      className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border/30 bg-card
        hover:border-accent/40 hover:bg-accent/5 transition-all duration-150 group"
    >
      <span className="text-base font-bold text-accent">{hizb.number}</span>
      <span className="text-[10px] text-muted-foreground/55">Hizb {hizb.number}</span>
      <span className="text-[9px] text-muted-foreground/35">Juz {hizb.juzNum}</span>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ chapters: Array }} props  — server-fetched list of all 114 surahs
 */
export default function HomeClient({ chapters }) {
  const [activeTab, setActiveTab] = useState("surah");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter(
      (ch) =>
        ch.name_simple.toLowerCase().includes(q) ||
        ch.name_arabic.includes(search.trim()) ||
        (ch.translated_name?.name ?? "").toLowerCase().includes(q) ||
        String(ch.id) === q,
    );
  }, [chapters, search]);

  const TABS = [
    { id: "surah", label: "Surah", count: 114 },
    { id: "juz", label: "Juz", count: 30 },
    { id: "hizb", label: "Hizb", count: 60 },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 pb-24 md:pb-8">
      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div className="relative mb-5">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/45 pointer-events-none"
        />
        <input
          type="text"
          inputMode="search"
          placeholder="Search by name, number or meaning…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-8 py-2.5 bg-card border border-border/50 rounded-xl text-sm
            placeholder:text-muted-foreground/35 focus:outline-none focus:border-accent/50 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/45 hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-muted/40 border border-border/30 rounded-xl mb-5 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSearch("");
            }}
            className={cn(
              "px-4 sm:px-5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150",
              activeTab === tab.id
                ? "bg-card text-accent shadow-sm border border-border/40"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            <span
              className={cn("ml-1.5 text-[10px]", activeTab === tab.id ? "text-accent/60" : "text-muted-foreground/40")}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Surah Tab ──────────────────────────────────────────────────────── */}
      {activeTab === "surah" && (
        <div className="space-y-0.5">
          {filtered.map((chapter) => (
            <SurahRow key={chapter.id} chapter={chapter} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-muted-foreground">No surahs found for &ldquo;{search}&rdquo;</p>
              <button onClick={() => setSearch("")} className="mt-2 text-xs text-accent hover:underline">
                Clear search
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Juz Tab ────────────────────────────────────────────────────────── */}
      {activeTab === "juz" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {JUZ_DATA.map((juz) => (
            <JuzCard key={juz.number} juz={juz} />
          ))}
        </div>
      )}

      {/* ── Hizb Tab ───────────────────────────────────────────────────────── */}
      {activeTab === "hizb" && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {HIZB_DATA.map((hizb) => (
            <HizbCard key={hizb.number} hizb={hizb} />
          ))}
        </div>
      )}
    </div>
  );
}
