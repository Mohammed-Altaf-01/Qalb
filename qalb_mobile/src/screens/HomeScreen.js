/**
 * HomeScreen — Daily verse, streak, quick actions.
 *
 * Mirrors web app / (Home) page.js:
 *  - Fetches daily verse from Vercel /api/verse/daily, falls back to random verse
 *  - Displays Arabic text + translation + AudioPlayer
 *  - Quick-action grid (4 cards linking to other screens)
 *  - Recent bookmarks strip
 */

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CONFIG, isVercelConfigured } from '../config';
import storage, { STORAGE_KEYS } from '../lib/storage';
import { getTextSizePreset } from '../lib/text-settings';
import { QuranRepository } from '../lib/quran-api';
import useGamification from '../lib/useGamification';
import AudioPlayer from '../components/AudioPlayer';
import LoadingSpinner from '../components/LoadingSpinner';
import WordByWordArabic from '../components/WordByWordArabic';
import { ARABIC_TYPOGRAPHY, COLORS, FONT_SIZE, RADIUS, SHADOW, SPACING } from '../theme';

// 30 curated verse keys — same set as web app deterministic daily verse
const DAILY_VERSES = [
  '2:255','2:286','3:173','39:53','94:5','65:3','2:152','3:190',
  '13:28','33:56','17:80','18:10','2:45','3:8','7:23','20:114',
  '23:97','25:74','40:60','59:22','112:1','113:1','114:1','1:1',
  '3:26','6:162','17:44','22:46','38:29','57:3',
];

function getTodayVerseKey() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

function dedupeByNumber(items = [], possibleKeys = []) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = possibleKeys.map((k) => item?.[k]).find((v) => v !== undefined && v !== null);
    if (key === undefined || key === null) continue;
    const normalized = String(key);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(item);
  }
  return result;
}

export default function HomeScreen({ navigation }) {
  const { state: gamificationState, levelInfo } = useGamification();
  const [verse, setVerse] = useState(null);
  const [chapterName, setChapterName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [streak, setStreak] = useState(0);
  const [chapters, setChapters] = useState([]);
  const [juzs, setJuzs] = useState([]);
  const [hizbs, setHizbs] = useState([]);
  const [lastReadSurahs, setLastReadSurahs] = useState([]);
  const [listTab, setListTab] = useState('Surahs');
  const [listQuery, setListQuery] = useState('');
  const [textPreset, setTextPreset] = useState({ arabic: 1, body: 1 });
  const [playback, setPlayback] = useState({ playing: false, progress: 0 });

  useEffect(() => {
    setListQuery('');
  }, [listTab]);

  const loadDailyVerse = useCallback(async () => {
    try {
      // Try Vercel API first
      if (isVercelConfigured()) {
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/verse/daily`);
        if (res.ok) {
          const data = await res.json();
          if (data?.verse) {
            setVerse(data.verse);
            setChapterName(data.chapterName ?? '');
            return;
          }
        }
      }

      // Fallback: deterministic verse key → direct Quran API
      const key = getTodayVerseKey();
      const [verseData, chapterData] = await Promise.all([
        QuranRepository.getVerseByKey(key),
        QuranRepository.getChapter(key.split(':')[0]).catch(() => null),
      ]);
      setVerse(verseData.verse);
      setChapterName(
        chapterData?.chapter?.name_simple ??
          chapterData?.chapter?.translated_name?.name ??
          '',
      );
    } catch (e) {
      setError('Could not load daily verse. Please check your connection.');
    }
  }, []);

  const loadBookmarks = useCallback(async () => {
    const bm = (await storage.get(STORAGE_KEYS.BOOKMARKS)) ?? {};
    setBookmarks(Object.values(bm).slice(0, 5));
  }, []);

  const loadStreak = useCallback(async () => {
    const progress = (await storage.get(STORAGE_KEYS.READING_PROGRESS)) ?? {};
    setStreak(progress.streak ?? 0);
  }, []);

  const loadChapters = useCallback(async () => {
    const data = await QuranRepository.getChapters();
    setChapters(data?.chapters ?? []);
  }, []);

  const loadJuzsAndHizbs = useCallback(async () => {
    const [juzData, hizbData] = await Promise.all([
      QuranRepository.getJuzs().catch(() => ({ juzs: [] })),
      QuranRepository.getHizbs().catch(() => ({ hizbs: [] })),
    ]);
    setJuzs(dedupeByNumber(juzData?.juzs ?? [], ['juz_number', 'id']));
    setHizbs(dedupeByNumber(hizbData?.hizbs ?? [], ['hizb_number', 'id']));
  }, []);

  const loadLastReadSurahs = useCallback(async () => {
    const history = (await storage.get(STORAGE_KEYS.READING_HISTORY)) ?? [];
    setLastReadSurahs(history.slice(0, 5));
  }, []);

  useEffect(() => {
    Promise.all([loadDailyVerse(), loadBookmarks(), loadStreak(), loadChapters(), loadJuzsAndHizbs(), loadLastReadSurahs()]).finally(() =>
      setLoading(false),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      getTextSizePreset().then((p) => setTextPreset({ arabic: p.arabic, body: p.body }));
      loadLastReadSurahs();
    }, [loadLastReadSurahs]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDailyVerse(), loadBookmarks(), loadStreak(), loadChapters(), loadJuzsAndHizbs(), loadLastReadSurahs()]);
    setRefreshing(false);
  }, [loadDailyVerse, loadBookmarks, loadChapters, loadJuzsAndHizbs, loadLastReadSurahs]);

  const toggleBookmark = useCallback(async () => {
    if (!verse) return;
    const key = verse.verse_key;
    const bm = (await storage.get(STORAGE_KEYS.BOOKMARKS)) ?? {};
    if (bm[key]) {
      delete bm[key];
    } else {
      bm[key] = { verseKey: key, savedAt: Date.now(), chapterName };
    }
    await storage.set(STORAGE_KEYS.BOOKMARKS, bm);
    loadBookmarks();
  }, [verse, chapterName]);

  const isBookmarked = verse
    ? bookmarks.some((b) => b.verseKey === verse.verse_key)
    : false;

  const translation =
    verse?.translations?.[0]?.text?.replace(/<[^>]*>/g, '').trim() ?? '';

  const normalizedQuery = listQuery.trim().toLowerCase();
  const filteredSurahs = normalizedQuery
    ? chapters.filter(
        (c) =>
          c.name_simple?.toLowerCase().includes(normalizedQuery) ||
          c.name_arabic?.includes(normalizedQuery) ||
          String(c.id).includes(normalizedQuery),
      )
    : chapters;
  const filteredJuzs = normalizedQuery
    ? juzs.filter((j) => String(j.juz_number ?? j.id ?? '').includes(normalizedQuery))
    : juzs;
  const filteredHizbs = normalizedQuery
    ? hizbs.filter((h) => String(h.hizb_number ?? h.id ?? '').includes(normalizedQuery))
    : hizbs;

  if (loading) return <LoadingSpinner message="Loading daily verse…" />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.kaabaFrame}>
              <Text style={styles.kaabaIcon}>🕋</Text>
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroLabel}>Begin with remembrance</Text>
              <Text style={styles.heroBismillah}>بسم الله الرحمن الرحيم</Text>
              <Text style={styles.heroSubtitle}>Quran for your daily moments.</Text>
              <Text style={styles.heroLevel}>
                {levelInfo.current.icon} {levelInfo.current.title} · {gamificationState?.xp ?? 0} XP
              </Text>
            </View>
          </View>
          {streak > 0 && (
            <View style={[styles.streakBadge, styles.streakBadgeInHero]}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakText}>{streak} day{streak !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>

        {/* Daily verse section label */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionLabel}>Daily Verse</Text>
        </View>

        {/* Verse card */}
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : verse ? (
          <View style={[styles.verseCard, SHADOW]}>
            {/* Verse key + chapter + bookmark */}
            <View style={styles.verseHeader}>
              <View style={styles.verseKeyBadge}>
                <Text style={styles.verseKeyText}>{verse.verse_key}</Text>
              </View>
              {chapterName ? (
                <Text style={styles.chapterName}>{chapterName}</Text>
              ) : null}
              <TouchableOpacity onPress={toggleBookmark} style={styles.bookmarkBtn}>
                <Text style={[styles.bookmarkIcon, isBookmarked && styles.bookmarkActive]}>
                  {isBookmarked ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Arabic */}
            <WordByWordArabic
              text={verse.text_uthmani}
              isPlaying={playback.playing}
              progress={playback.progress}
              textStyle={[
                styles.arabic,
                {
                  fontSize: ARABIC_TYPOGRAPHY.fontSizeDisplay * textPreset.arabic,
                  lineHeight: ARABIC_TYPOGRAPHY.lineHeightDisplay * textPreset.arabic,
                },
              ]}
            />

            {/* Divider */}
            <View style={styles.divider} />

            {/* Translation */}
            <Text
              style={[
                styles.translation,
                { fontSize: FONT_SIZE.sm * textPreset.body, lineHeight: 22 * textPreset.body },
              ]}
            >
              {translation}
            </Text>

            {/* Audio player */}
            <View style={styles.audioWrapper}>
              <AudioPlayer verseKey={verse.verse_key} onPlaybackStatusChange={setPlayback} />
            </View>

            {/* Explore verse detail */}
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() =>
                navigation.navigate('VerseDetail', {
                  verseKey: verse.verse_key,
                  chapterName,
                })
              }
            >
              <Text style={styles.exploreBtnText}>Explore this Verse →</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Quran sections */}
        {(chapters.length > 0 || juzs.length > 0 || hizbs.length > 0) && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionLabel}>
                {listTab === 'Surahs'
                  ? `Quran Sections · ${chapters.length} Surahs`
                  : listTab === 'Juz'
                    ? `Quran Sections · ${juzs.length} Juz`
                    : `Quran Sections · ${hizbs.length} Hizb`}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Read')}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.switcher}>
              {['Surahs', 'Juz', 'Hizb'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.switcherBtn, listTab === tab && styles.switcherBtnActive]}
                  onPress={() => setListTab(tab)}
                >
                  <Text style={[styles.switcherText, listTab === tab && styles.switcherTextActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.listSearchWrap}>
              <TextInput
                style={styles.listSearchInput}
                value={listQuery}
                onChangeText={setListQuery}
                placeholder={listTab === 'Surahs' ? 'Search Surah by name or number' : `Search ${listTab} by number`}
                placeholderTextColor={COLORS.textFaint}
              />
            </View>

            <ScrollView style={styles.verticalListScrollable} nestedScrollEnabled>
              <View style={styles.verticalList}>
              {listTab === 'Surahs' &&
                filteredSurahs.map((chapter) => (
                  <TouchableOpacity
                    key={`surah-${chapter.id}`}
                    style={styles.surahRow}
                    onPress={() => navigation.navigate('Read', { initialChapterId: chapter.id })}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.surahChipId}>{chapter.id}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.surahChipName}>{chapter.name_simple}</Text>
                      <Text style={styles.surahChipArabic} numberOfLines={1}>{chapter.name_arabic}</Text>
                    </View>
                    <Text style={styles.rowArrow}>→</Text>
                  </TouchableOpacity>
                ))}

              {listTab === 'Juz' &&
                filteredJuzs.map((juz, idx) => (
                  <TouchableOpacity
                    key={`juz-${juz.id ?? idx}`}
                    style={styles.surahRow}
                    onPress={() => {
                      const startChapter = Number(Object.keys(juz.verse_mapping ?? {})[0]);
                      if (startChapter) navigation.navigate('Read', { initialChapterId: startChapter });
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.surahChipId}>{juz.juz_number ?? juz.id ?? idx + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.surahChipName}>Juz {juz.juz_number ?? juz.id ?? idx + 1}</Text>
                      <Text style={styles.surahChipArabic} numberOfLines={1}>
                        {juz.verse_mapping ? Object.keys(juz.verse_mapping)[0] : 'Section'}
                      </Text>
                    </View>
                    <Text style={styles.rowArrow}>→</Text>
                  </TouchableOpacity>
                ))}

              {listTab === 'Hizb' &&
                filteredHizbs.map((hizb, idx) => (
                  <TouchableOpacity
                    key={`hizb-${hizb.id ?? idx}`}
                    style={styles.surahRow}
                    onPress={() => {
                      const startChapter = Number(Object.keys(hizb.verse_mapping ?? {})[0]);
                      if (startChapter) navigation.navigate('Read', { initialChapterId: startChapter });
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.surahChipId}>{hizb.hizb_number ?? hizb.id ?? idx + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.surahChipName}>Hizb {hizb.hizb_number ?? hizb.id ?? idx + 1}</Text>
                      <Text style={styles.surahChipArabic} numberOfLines={1}>
                        {hizb.rub_el_hizb_number ? `Rub ${hizb.rub_el_hizb_number}` : 'Section'}
                      </Text>
                    </View>
                    <Text style={styles.rowArrow}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {lastReadSurahs.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionLabel}>Last 5 Read Surahs</Text>
            </View>
            <View style={styles.verticalList}>
              {lastReadSurahs.map((item) => (
                <TouchableOpacity
                  key={`recent-${item.chapterId}-${item.at}`}
                  style={styles.surahRow}
                  onPress={() => navigation.navigate('Read', { initialChapterId: item.chapterId })}
                >
                  <Text style={styles.surahChipId}>{item.chapterId}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.surahChipName}>{item.surahName}</Text>
                    <Text style={styles.surahChipArabic} numberOfLines={1}>{item.chapterArabic ?? ''}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Recent bookmarks */}
        {bookmarks.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionLabel}>Recent Bookmarks</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Library')}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookmarkScroll}>
              {bookmarks.map((bm) => (
                <TouchableOpacity
                  key={bm.verseKey}
                  style={styles.bookmarkChip}
                  onPress={() =>
                    navigation.navigate('VerseDetail', {
                      verseKey: bm.verseKey,
                      chapterName: bm.chapterName ?? '',
                    })
                  }
                >
                  <Text style={styles.bookmarkChipKey}>{bm.verseKey}</Text>
                  {bm.chapterName ? (
                    <Text style={styles.bookmarkChipChapter}>{bm.chapterName}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.md },

  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  kaabaFrame: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.muted,
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kaabaIcon: { fontSize: 34 },
  heroTextWrap: { flex: 1 },
  heroLabel: { color: COLORS.accent, fontSize: FONT_SIZE.xs, fontWeight: '700', textTransform: 'uppercase' },
  heroBismillah: {
    color: COLORS.text,
    fontSize: ARABIC_TYPOGRAPHY.fontSizeCompact,
    lineHeight: ARABIC_TYPOGRAPHY.lineHeightCompact,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  heroSubtitle: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: 2 },
  heroLevel: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs, marginTop: 2 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentDim,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    gap: 4,
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
  },
  streakBadgeInHero: { alignSelf: 'flex-end', marginTop: SPACING.sm },
  streakIcon: { fontSize: 14 },
  streakText: { color: COLORS.accent, fontSize: FONT_SIZE.xs, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  seeAll: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.xs,
  },

  errorCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, textAlign: 'center' },

  verseCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  verseKeyBadge: {
    backgroundColor: COLORS.primaryDim,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  verseKeyText: { color: COLORS.primary, fontSize: FONT_SIZE.xs, fontWeight: '600' },
  chapterName: { flex: 1, color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  bookmarkBtn: { paddingLeft: SPACING.sm },
  bookmarkIcon: { fontSize: 20, color: COLORS.textFaint },
  bookmarkActive: { color: COLORS.accent },

  arabic: {
    color: COLORS.text,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginVertical: SPACING.xs,
  },
  divider: { height: 1, backgroundColor: COLORS.border },
  translation: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    lineHeight: 22,
  },
  audioWrapper: { marginTop: SPACING.xs },
  exploreBtn: {
    alignSelf: 'flex-end',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.primaryDim,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  exploreBtnText: { color: COLORS.primary, fontSize: FONT_SIZE.xs, fontWeight: '600' },

  switcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.muted,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.sm,
  },
  switcherBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
  },
  switcherBtnActive: { backgroundColor: COLORS.card },
  switcherText: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs, fontWeight: '600' },
  switcherTextActive: { color: COLORS.accent },
  listSearchWrap: { marginBottom: SPACING.sm },
  listSearchInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    height: 40,
    paddingHorizontal: SPACING.sm,
  },
  verticalListScrollable: {
    maxHeight: 360,
  },
  verticalList: { gap: SPACING.xs },
  surahRow: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  surahChipId: { color: COLORS.accent, fontSize: FONT_SIZE.xs, fontWeight: '700' },
  surahChipName: { color: COLORS.text, fontSize: FONT_SIZE.xs, marginTop: 2 },
  surahChipArabic: {
    color: COLORS.textMuted,
    fontSize: ARABIC_TYPOGRAPHY.fontSizeCompact - 4,
    lineHeight: ARABIC_TYPOGRAPHY.lineHeightCompact - 10,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 2,
  },
  rowArrow: { color: COLORS.textFaint, fontSize: FONT_SIZE.sm, marginLeft: SPACING.xs },

  bookmarkScroll: { marginBottom: SPACING.sm },
  bookmarkChip: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 80,
  },
  bookmarkChipKey: { color: COLORS.accent, fontSize: FONT_SIZE.xs, fontWeight: '600' },
  bookmarkChipChapter: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs - 1, marginTop: 2 },
});
