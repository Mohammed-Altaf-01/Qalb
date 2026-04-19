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
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CONFIG, isVercelConfigured } from '../config';
import storage, { STORAGE_KEYS } from '../lib/storage';
import { QuranRepository } from '../lib/quran-api';
import AudioPlayer from '../components/AudioPlayer';
import LoadingSpinner from '../components/LoadingSpinner';
import { COLORS, FONT_SIZE, RADIUS, SHADOW, SPACING } from '../theme';

const QUICK_ACTIONS = [
  { label: 'Discover', icon: '◎', desc: "What's on your mind?", screen: 'Discover', color: COLORS.primary },
  { label: 'Read', icon: '☰', desc: 'Read the Quran', screen: 'Read', color: '#5b8fd4' },
  { label: 'Library', icon: '★', desc: 'Your bookmarks', screen: 'Library', color: COLORS.accent },
  { label: 'Goals', icon: '◆', desc: 'Track your goals', screen: 'Goals', color: '#b07cc6' },
];

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

export default function HomeScreen({ navigation }) {
  const [verse, setVerse] = useState(null);
  const [chapterName, setChapterName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [streak, setStreak] = useState(0);

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

  useEffect(() => {
    Promise.all([loadDailyVerse(), loadBookmarks(), loadStreak()]).finally(() =>
      setLoading(false),
    );
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDailyVerse(), loadBookmarks(), loadStreak()]);
    setRefreshing(false);
  }, [loadDailyVerse, loadBookmarks]);

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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>السَّلَامُ عَلَيْكُمْ</Text>
            <Text style={styles.appTitle}>Qalb</Text>
          </View>
          {streak > 0 && (
            <View style={styles.streakBadge}>
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
            <Text style={styles.arabic}>{verse.text_uthmani}</Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Translation */}
            <Text style={styles.translation}>{translation}</Text>

            {/* Audio player */}
            <View style={styles.audioWrapper}>
              <AudioPlayer verseKey={verse.verse_key} />
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

        {/* Quick actions */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionLabel}>Quick Actions</Text>
        </View>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionCard, SHADOW, { borderColor: `${action.color}30` }]}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionIcon, { color: action.color }]}>{action.icon}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionDesc}>{action.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  greeting: {
    color: COLORS.textFaint,
    fontSize: FONT_SIZE.sm,
    marginBottom: 2,
  },
  appTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xxl + 4,
    fontWeight: '800',
    letterSpacing: 1,
  },
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
    fontSize: FONT_SIZE.arabic + 4,
    color: COLORS.text,
    textAlign: 'right',
    lineHeight: 56,
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

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  actionCard: {
    width: '47%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  actionIcon: { fontSize: 22 },
  actionLabel: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '700' },
  actionDesc: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs },

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
