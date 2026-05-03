/**
 * Curated ahadith for home preview and /ahadith reading mode.
 * Single source of truth so future features (search, bookmarks, gamification) can import the same list.
 *
 * Sources use common English citations; verify wording with your preferred hadith corpus for production.
 */

/** @typedef {{ id: string; title: string; arabic: string; translation: string; source: string }} AhadithEntry */

/** @type {AhadithEntry[]} */
export const AHADITH_COLLECTION = [
  {
    id: "intentions",
    title: "Actions are by intentions",
    arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
    translation:
      "Actions are judged by intentions, and each person will have only what they intended. Whoever emigrated for Allah and His Messenger, their emigration is for Allah and His Messenger; and whoever emigrated for a worldly gain or to marry, their emigration is for that which they emigrated.",
    source: "Sahih al-Bukhari 1 · Sahih Muslim 1907 a (Hadith of Umar)",
  },
  {
    id: "religion-is-naseeha",
    title: "Religion is sincere counsel",
    arabic: "الدِّينُ النَّصِيحَةُ",
    translation:
      "The religion is sincere counsel. When asked for whom, the Prophet said: For Allah, His Book, His Messenger, the leaders of the Muslims, and their common people.",
    source: "Sahih Muslim 55 a",
  },
  {
    id: "learn-teach-quran",
    title: "The best of you",
    arabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
    translation: "The best among you is he who learns the Quran and teaches it.",
    source: "Sahih al-Bukhari 5027",
  },
  {
    id: "ihsan",
    title: "The meaning of Ihsan",
    arabic: "أَنْ تَعْبُدَ اللَّهَ كَأَنَّكَ تَرَاهُ، فَإِنْ لَمْ تَكُنْ تَرَاهُ فَإِنَّهُ يَرَاكَ",
    translation:
      "It is that you worship Allah as though you see Him; and though you do not see Him, He certainly sees you.",
    source: "Sahih al-Bukhari 50 · Sahih Muslim 8 a",
  },
  {
    id: "ease-not-hardship",
    title: "Make things easy",
    arabic: "يَسِّرُوا وَلَا تُعَسِّرُوا، وَبَشِّرُوا وَلَا تُنَفِّرُوا",
    translation: "Make things easy, do not make them difficult; give glad tidings, do not drive people away.",
    source: "Sahih al-Bukhari 69",
  },
  {
    id: "strong-believer",
    title: "The strong believer",
    arabic: "الْمُؤْمِنُ الْقَوِيُّ خَيْرٌ وَأَحَبُّ إِلَى اللَّهِ مِنَ الْمُؤْمِنِ الضَّعِيفِ",
    translation:
      "The strong believer is better and more beloved to Allah than the weak believer, while there is good in both.",
    source: "Sahih Muslim 2664 a",
  },
];

/** First entries shown on the home page (subset of {@link AHADITH_COLLECTION}). */
export const HOME_AHADITH_PREVIEW_COUNT = 3;

export function getHomeAhadithPreview() {
  return AHADITH_COLLECTION.slice(0, HOME_AHADITH_PREVIEW_COUNT);
}

/**
 * @param {string} id
 * @returns {AhadithEntry | undefined}
 */
export function getAhadithById(id) {
  return AHADITH_COLLECTION.find((h) => h.id === id);
}
