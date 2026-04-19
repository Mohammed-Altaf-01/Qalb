"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const CONTENT = [
  {
    type: "ayah",
    arabic: "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا",
    text: "Indeed, with hardship will be ease.",
    ref: "Ash-Sharh · 94:6",
  },
  {
    type: "hadith",
    arabic: null,
    text: "The best of you are those who learn the Quran and teach it.",
    ref: "Sahih al-Bukhari · 5027",
  },
  {
    type: "ayah",
    arabic: "وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ",
    text: "And He is with you wherever you are.",
    ref: "Al-Hadid · 57:4",
  },
  {
    type: "hadith",
    arabic: null,
    text: "None of you truly believes until he loves for his brother what he loves for himself.",
    ref: "Sahih al-Bukhari · 13",
  },
  {
    type: "ayah",
    arabic: "فَٱذْكُرُونِىٓ أَذْكُرْكُمْ",
    text: "So remember Me; I will remember you.",
    ref: "Al-Baqarah · 2:152",
  },
  {
    type: "hadith",
    arabic: null,
    text: "Smiling at your brother is an act of charity.",
    ref: "Jami' at-Tirmidhi · 1956",
  },
  {
    type: "ayah",
    arabic: "ٱدْعُونِىٓ أَسْتَجِبْ لَكُمْ",
    text: "Call upon Me; I will respond to you.",
    ref: "Ghafir · 40:60",
  },
  {
    type: "hadith",
    arabic: null,
    text: "Make things easy, do not make them difficult. Give glad tidings, do not drive people away.",
    ref: "Sahih al-Bukhari · 69",
  },
  {
    type: "ayah",
    arabic: "حَسْبُنَا ٱللَّهُ وَنِعْمَ ٱلْوَكِيلُ",
    text: "Sufficient for us is Allah, and He is the best Disposer of affairs.",
    ref: "Al-Imran · 3:173",
  },
  {
    type: "hadith",
    arabic: null,
    text: "The strong person is not the one who overpowers others — it is the one who controls himself when angry.",
    ref: "Sahih al-Bukhari · 6114",
  },
  {
    type: "ayah",
    arabic: "وَعَسَىٰٓ أَن تَكْرَهُوا۟ شَيْـًٔا وَهُوَ خَيْرٌ لَّكُمْ",
    text: "It may be that you dislike a thing while it is good for you.",
    ref: "Al-Baqarah · 2:216",
  },
  {
    type: "hadith",
    arabic: null,
    text: "Whoever believes in Allah and the Last Day, let him speak good or remain silent.",
    ref: "Sahih al-Bukhari · 6475",
  },
];

export default function RotatingVerse() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      const t = setTimeout(() => {
        setIdx((i) => (i + 1) % CONTENT.length);
        setVisible(true);
      }, 450);
      return () => clearTimeout(t);
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const item = CONTENT[idx];

  return (
    // Desktop-only — hidden on mobile where space is tight
    <div className="hidden md:block mb-5">
      <div
        className={cn("transition-opacity duration-450 ease-in-out", visible ? "opacity-100" : "opacity-0")}
        style={{ transitionDuration: "450ms" }}
      >
        <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm px-5 py-3.5 flex items-start gap-4">
          {/* Type badge */}
          <span
            className={cn(
              "shrink-0 mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              item.type === "ayah"
                ? "bg-accent/12 text-accent border-accent/25"
                : "bg-primary/12 text-primary border-primary/25",
            )}
          >
            {item.type === "ayah" ? "Quran" : "Hadith"}
          </span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {item.arabic && (
              <p className="arabic-text text-foreground/88 text-lg leading-relaxed mb-1.5" lang="ar" dir="rtl">
                {item.arabic}
              </p>
            )}
            <p className="text-sm text-foreground/72 leading-relaxed italic">&ldquo;{item.text}&rdquo;</p>
            <p className="text-[11px] text-muted-foreground/45 mt-1.5 tracking-wide">{item.ref}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
