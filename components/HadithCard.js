/**
 * @fileoverview HadithCard — Client Component
 *
 * Displays the "Hadith of the Day" and allows the user to cycle through
 * the curated hadith collection with a small refresh button.
 *
 * State is pure client-side (no API needed) — the full hadith corpus is
 * bundled here and indexed by date on first render.
 */

"use client";

import { useState } from "react";

import { RotateCcw } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Hadith Corpus — 20 authenticated hadith (Bukhari / Muslim / Tirmidhi)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @type {Array<{arabic: string, text: string, source: string, narrator: string}>}
 */
const HADITH_LIST = [
  {
    arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
    text: "Actions are judged by intentions, and every person will have what they intended.",
    source: "Sahih al-Bukhari 1",
    narrator: "Umar ibn al-Khattab (RA)",
  },
  {
    arabic: "لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ",
    text: "None of you truly believes until he loves for his brother what he loves for himself.",
    source: "Sahih al-Bukhari 13",
    narrator: "Anas ibn Malik (RA)",
  },
  {
    arabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ القُرْآنَ وَعَلَّمَهُ",
    text: "The best of you are those who learn the Quran and teach it.",
    source: "Sahih al-Bukhari 5027",
    narrator: "Uthman ibn Affan (RA)",
  },
  {
    arabic: "الطَّهُورُ شَطْرُ الإِيمَانِ",
    text: "Cleanliness is half of faith.",
    source: "Sahih Muslim 223",
    narrator: "Abu Malik al-Ash'ari (RA)",
  },
  {
    arabic: "تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ صَدَقَةٌ",
    text: "Your smile in the face of your brother is charity.",
    source: "Jami' al-Tirmidhi 1956",
    narrator: "Abu Dharr al-Ghifari (RA)",
  },
  {
    arabic: "لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ، إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الغَضَبِ",
    text: "The strong man is not one who is good at wrestling; the strong man is the one who controls himself in a fit of rage.",
    source: "Sahih al-Bukhari 6114",
    narrator: "Abu Hurayrah (RA)",
  },
  {
    arabic: "مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَاليَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ",
    text: "Whoever believes in Allah and the Last Day should speak good or remain silent.",
    source: "Sahih al-Bukhari 6018",
    narrator: "Abu Hurayrah (RA)",
  },
  {
    arabic: "إِنَّ اللَّهَ رَفِيقٌ يُحِبُّ الرِّفْقَ فِي الأَمْرِ كُلِّهِ",
    text: "Allah is gentle and loves gentleness in all matters.",
    source: "Sahih al-Bukhari 6927",
    narrator: "Aisha (RA)",
  },
  {
    arabic: "الدِّينُ النَّصِيحَةُ",
    text: "The religion is sincere counsel — to Allah, His Book, His Messenger, and all Muslims.",
    source: "Sahih Muslim 55",
    narrator: "Tamim al-Dari (RA)",
  },
  {
    arabic: "اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ وَأَتْبِعِ السَّيِّئَةَ الحَسَنَةَ تَمْحُهَا",
    text: "Fear Allah wherever you are; follow a bad deed with a good one to erase it, and treat people with good character.",
    source: "Jami' al-Tirmidhi 1987",
    narrator: "Abu Dharr al-Ghifari (RA)",
  },
  {
    arabic: "أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ",
    text: "The most beloved deeds to Allah are those done consistently, even if they are small.",
    source: "Sahih al-Bukhari 6465",
    narrator: "Aisha (RA)",
  },
  {
    arabic: "يَسِّرُوا وَلاَ تُعَسِّرُوا وَبَشِّرُوا وَلاَ تُنَفِّرُوا",
    text: "Make things easy and do not make them difficult; give glad tidings and do not drive people away.",
    source: "Sahih al-Bukhari 69",
    narrator: "Anas ibn Malik (RA)",
  },
  {
    arabic: "الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ",
    text: "A Muslim is one from whose tongue and hands other Muslims are safe.",
    source: "Sahih al-Bukhari 10",
    narrator: "Abdullah ibn Amr (RA)",
  },
  {
    arabic: "الصِّدْقُ يَهْدِي إِلَى الْبِرِّ وَإِنَّ الْبِرَّ يَهْدِي إِلَى الْجَنَّةِ",
    text: "Truthfulness leads to righteousness, and righteousness leads to Paradise.",
    source: "Sahih al-Bukhari 6094",
    narrator: "Abdullah ibn Mas'ud (RA)",
  },
  {
    arabic: "كُلُّ مَعْرُوفٍ صَدَقَةٌ",
    text: "Every act of kindness is charity.",
    source: "Sahih al-Bukhari 6021",
    narrator: "Jabir ibn Abdullah (RA)",
  },
  {
    arabic: "إِنَّ مِنْ أَحَبِّكُمْ إِلَيَّ أَحَاسِنَكُمْ أَخْلاَقًا",
    text: "The most beloved of you to me are those with the best character.",
    source: "Jami' al-Tirmidhi 2018",
    narrator: "Jabir ibn Abdullah (RA)",
  },
  {
    arabic: "مَنْ صَامَ رَمَضَانَ ثُمَّ أَتْبَعَهُ سِتًّا مِنْ شَوَّالٍ كَانَ كَصِيَامِ الدَّهْرِ",
    text: "Whoever fasts Ramadan then follows it with six days of Shawwal, it is as if he fasted the entire year.",
    source: "Sahih Muslim 1164",
    narrator: "Abu Ayyub al-Ansari (RA)",
  },
  {
    arabic: "خَيْرُكُمْ خَيْرُكُمْ لأَهْلِهِ",
    text: "The best of you is the one who is best to his family.",
    source: "Jami' al-Tirmidhi 3895",
    narrator: "Aisha (RA)",
  },
  {
    arabic: "إِنَّ اللَّهَ جَمِيلٌ يُحِبُّ الْجَمَالَ",
    text: "Allah is beautiful and loves beauty.",
    source: "Sahih Muslim 91",
    narrator: "Abdullah ibn Mas'ud (RA)",
  },
  {
    arabic: "حُسْنُ الخُلُقِ يُذِيبُ الخَطَايَا كَمَا تُذِيبُ الشَّمْسُ الجَلِيدَ",
    text: "Good character dissolves sins as the sun dissolves ice.",
    source: "Shu'ab al-Iman (al-Bayhaqi)",
    narrator: "Abdullah ibn Abbas (RA)",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns today's hadith index using the same date-mod strategy as the daily verse.
 * Deterministic — all users see the same hadith on the same calendar day.
 *
 * @returns {number}
 */
function todayIndex() {
  const d = new Date();
  const dateInt = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return dateInt % HADITH_LIST.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hadith of the Day card with a subtle next-hadith refresh button.
 * Refresh cycles forward through the list — no network call required.
 */
export default function HadithCard() {
  const [idx, setIdx] = useState(todayIndex);
  const [spinning, setSpinning] = useState(false);
  const hadith = HADITH_LIST[idx];

  /**
   * Advances to the next hadith and plays a brief spin animation.
   */
  function handleNext() {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 500);
    setIdx((prev) => (prev + 1) % HADITH_LIST.length);
  }

  return (
    <div
      className="rounded-2xl border border-border/40 bg-card p-5 relative overflow-hidden
      transition-all duration-200 hover:brightness-90 hover:border-border/60"
    >
      {/* Decorative oversized opening quote */}
      <div
        className="absolute top-1 right-4 text-7xl leading-none select-none pointer-events-none"
        style={{ color: "oklch(0.72 0.13 75 / 0.08)", fontFamily: "Georgia, serif" }}
        aria-hidden="true"
      >
        &#x201C;
      </div>

      {/* Section label */}
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="flex-1 h-px bg-accent/30" />
        Hadith of the Day
        <span className="flex-1 h-px bg-accent/30" />
      </p>

      {/* Arabic text */}
      {hadith.arabic && (
        <p
          className="arabic-text-sm mb-3 leading-relaxed"
          style={{ color: "oklch(0.72 0.13 75 / 0.85)", textAlign: "right", direction: "rtl" }}
        >
          {hadith.arabic}
        </p>
      )}

      {/* Gold divider */}
      <div className="h-px w-8 bg-accent/30 mx-auto mb-3" />

      {/* English translation */}
      <p className="text-sm text-foreground/90 leading-relaxed italic mb-4 relative z-10">
        &ldquo;{hadith.text}&rdquo;
      </p>

      {/* Source + narrator + refresh button */}
      <div className="flex items-end justify-between gap-2 pt-2 border-t border-border/30">
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground leading-snug truncate">{hadith.narrator}</p>
          <p className="text-[10px] text-accent/60 font-medium">{hadith.source}</p>
        </div>

        {/* Reload button */}
        <button
          onClick={handleNext}
          aria-label="Load next hadith"
          title="Next hadith"
          className="flex items-center gap-1 text-[10px] text-muted-foreground/60
            hover:text-accent hover:opacity-80 transition-all duration-200
            active:scale-90 shrink-0 group"
        >
          <RotateCcw
            size={11}
            className={spinning ? "animate-spin" : "transition-transform duration-200 group-hover:rotate-180"}
            style={{ transitionDuration: spinning ? undefined : "400ms" }}
          />
          <span className="hidden sm:inline">Next</span>
        </button>
      </div>
    </div>
  );
}
