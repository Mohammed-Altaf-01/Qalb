/**
 * ReadScreen — Surah picker + paginated verse reader with AI summary.
 *
 * Mirrors web app /read page.js + ReadClient.js:
 *  - State machine: 'surahList' → 'verseReader'
 *  - 114 surahs in a searchable grid
 *  - Paginated verse reading (15 verses/page)
 *  - AI page summary via Vercel /api/ai/read-summary
 *  - Reading progress saved in AsyncStorage
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';
import { CONFIG, isVercelConfigured } from '../config';
import { aiService } from '../lib/claude';
import { getTextSizePreset } from '../lib/text-settings';
import useGamification from '../lib/useGamification';
import { QuranRepository } from '../lib/quran-api';
import storage, { STORAGE_KEYS } from '../lib/storage';
import { touchQuranLastReadChapter } from '../lib/quran-last-read-touch';
import AudioPlayer from '../components/AudioPlayer';
import WordByWordArabic from '../components/WordByWordArabic';
import MushafPageReader from './MushafPageReader';
import { ARABIC_TYPOGRAPHY, COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';
import { schedulePushReadingProgress } from '../lib/user-app-sync';

const TRANSLATIONS = [
  { id: 20, name: 'Saheeh International', lang: 'EN' },
  { id: 22, name: 'The Clear Quran', lang: 'EN' },
  { id: 85, name: 'Mufti Taqi Usmani', lang: 'UR' },
  { id: 234, name: 'Dr. Farhat Hashmi', lang: 'UR' },
  { id: 162, name: 'Turkish Diyanet', lang: 'TR' },
  { id: 31, name: 'French Hamidullah', lang: 'FR' },
];

function stripHtml(text = '') {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

// ── Surah picker ──────────────────────────────────────────────────────────────

function SurahGrid({
  chapters,
  onSelect,
  onOpenMushaf,
  searchQuery,
  onSearch,
  onBack,
  hasProgress,
  progress,
  onResumeReading,
}) {
  const filtered = chapters.filter(
    (c) =>
      c.name_simple?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.translated_name?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(c.id).includes(searchQuery),
  );

  return (
    <>
      {/* Header */}
      <View style={styles.readerHeader}>
        <Text style={styles.readerTitle}>Read</Text>
        <Text style={styles.readerSubtitle}>Choose a surah</Text>
      </View>

      {/* Resume reading banner */}
      {hasProgress && (
        <TouchableOpacity style={styles.resumeBanner} onPress={onResumeReading}>
          <View>
            <Text style={styles.resumeLabel}>Continue reading</Text>
            <Text style={styles.resumeDetail}>
              {progress?.readingLayout === 'mushaf'
                ? `Mushaf · Page ${progress?.mushafPage ?? 1}`
                : `${progress?.surahName ?? 'Surah'} · Page ${progress?.page ?? 1}`}
            </Text>
          </View>
          <Text style={styles.resumeArrow}>→</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.mushafEntry} onPress={onOpenMushaf} activeOpacity={0.8}>
        <Text style={styles.mushafEntryTitle}>Mushaf by page</Text>
        <Text style={styles.mushafEntrySub}>Pages 1–604 · continuous Arabic</Text>
      </TouchableOpacity>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={onSearch}
          placeholder="Search surah…"
          placeholderTextColor={COLORS.textFaint}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => onSearch('')}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => String(c.id)}
        numColumns={3}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.surahTile}
            onPress={() => onSelect(item)}
            activeOpacity={0.75}
          >
            <Text style={styles.surahNumber}>{item.id}</Text>
            <Text style={styles.surahName} numberOfLines={1}>
              {item.name_simple}
            </Text>
            <Text style={styles.surahArabic} numberOfLines={1}>
              {item.name_arabic}
            </Text>
            <Text style={styles.surahVerses}>{item.verses_count}v</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.surahGrid}
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}

// ── Verse reader ──────────────────────────────────────────────────────────────

function VerseReader({ chapter, onBack, navigation, textPreset }) {
  const { award } = useGamification();
  const [verses, setVerses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [translationId, setTranslationId] = useState(CONFIG.DEFAULT_TRANSLATION_ID);
  const [loading, setLoading] = useState(true);
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [priorSummary, setPriorSummary] = useState('');
  const [highlightEnabled, setHighlightEnabled] = useState(true);
  const [activePlayback, setActivePlayback] = useState({ verseKey: null, playing: false, progress: 0 });
  const [autoPlayTarget, setAutoPlayTarget] = useState({ verseKey: null, token: 0 });

  useEffect(() => {
    storage.get(STORAGE_KEYS.READING_PROGRESS).then((progress) => {
      if (progress?.translationId) setTranslationId(progress.translationId);
    });
  }, []);

  useEffect(() => {
    loadVerses();
  }, [page, translationId]);

  const loadVerses = async () => {
    setLoading(true);
    try {
      const data = await QuranRepository.getVersesByChapter(chapter.id, {
        translationId,
        page,
        perPage: CONFIG.VERSES_PER_PAGE,
      });
      const baseVerses = data.verses ?? [];
      const enrichedVerses = await Promise.all(
        baseVerses.map(async (verse) => {
          if ((verse?.translations?.length ?? 0) > 0) return verse;
          try {
            const fallback = await QuranRepository.getVerseByKey(verse.verse_key, { translationId });
            return { ...verse, translations: fallback?.verse?.translations ?? [] };
          } catch {
            return verse;
          }
        }),
      );
      setVerses(enrichedVerses);
      setPagination(data.pagination ?? null);

      // Save reading progress
      const firstVerseNum = (page - 1) * CONFIG.VERSES_PER_PAGE + 1;
      await storage.merge(STORAGE_KEYS.READING_PROGRESS, {
        surahId: chapter.id,
        chapterId: chapter.id,
        verseNum: firstVerseNum,
        surahName: chapter.name_simple,
        page,
        readingLayout: 'verses',
        translationId,
        lastRead: Date.now(),
        updatedAt: Date.now(),
      });
      schedulePushReadingProgress();
      const history = (await storage.get(STORAGE_KEYS.READING_HISTORY)) ?? [];
      const nextHistory = [
        { chapterId: chapter.id, surahName: chapter.name_simple, chapterArabic: chapter.name_arabic, at: Date.now() },
        ...history.filter((h) => h.chapterId !== chapter.id),
      ].slice(0, 5);
      await storage.set(STORAGE_KEYS.READING_HISTORY, nextHistory);
      const todayKey = new Date().toISOString().split('T')[0];
      const readTrack = (await storage.get('qalb_read_tracking')) ?? {};
      const readId = `${chapter.id}:${todayKey}`;
      if (!readTrack[readId]) {
        readTrack[readId] = true;
        await storage.set('qalb_read_tracking', readTrack);
        award('read_verse_page');
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!isVercelConfigured()) {
      setSummary('Configure API_BASE_URL in src/config.js to use AI summaries.');
      return;
    }
    setSummaryLoading(true);
    try {
      const versesText = verses
        .map((v) => {
          const t = stripHtml(v.translations?.[0]?.text ?? '');
          return `[${v.verse_key}] ${t}`;
        })
        .join('\n');

      const text = await aiService.readSummary({
        surahName: chapter.name_simple,
        pageNumber: page,
        versesText,
        priorSummary,
      });
      setSummary(text);
      if (pagination?.total_pages && page === pagination.total_pages) {
        setPriorSummary(text);
      }
    } catch {
      setSummary('Could not generate summary. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const currentTranslation = TRANSLATIONS.find((t) => t.id === translationId);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.verseReaderContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.verseReaderHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.verseReaderTitle}>
          <Text style={styles.surahTitle}>{chapter.name_simple}</Text>
          <Text style={styles.surahTitleArabic}>{chapter.name_arabic}</Text>
        </View>
        <TouchableOpacity
          style={styles.translationPickerBtn}
          onPress={() => setShowTranslationPicker((v) => !v)}
        >
          <Text style={styles.translationPickerText}>{currentTranslation?.lang ?? 'EN'} ▾</Text>
        </TouchableOpacity>
      </View>

      {/* Translation picker */}
      {showTranslationPicker && (
        <View style={styles.translationList}>
          {TRANSLATIONS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.translationOption, t.id === translationId && styles.translationOptionActive]}
              onPress={() => { setTranslationId(t.id); setShowTranslationPicker(false); }}
            >
              <Text style={[styles.translationOptionLang, t.id === translationId && styles.translationOptionLangActive]}>
                {t.lang}
              </Text>
              <Text style={styles.translationOptionName}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Basmala */}
      {chapter.id !== 1 && chapter.id !== 9 && page === 1 && (
        <Text
          style={[
            styles.basmala,
            {
              fontSize: ARABIC_TYPOGRAPHY.fontSizeCompact * textPreset.arabic,
              lineHeight: ARABIC_TYPOGRAPHY.lineHeightCompact * textPreset.arabic,
            },
          ]}
        >
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </Text>
      )}

      {/* Verses */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: SPACING.xl }} />
      ) : (
        verses.map((v) => {
          const translation = stripHtml(v.translations?.[0]?.text ?? '');
          return (
            <TouchableOpacity
              key={v.verse_key}
              style={styles.verseItem}
              onPress={() => navigation.navigate('VerseDetail', {
                verseKey: v.verse_key,
                chapterName: chapter.name_simple,
              })}
              activeOpacity={0.85}
            >
              <View style={styles.verseItemHeader}>
                <View style={styles.verseNumBadge}>
                  <Text style={styles.verseNumText}>{v.verse_number}</Text>
                </View>
                <Text style={styles.verseKeyLabel}>{v.verse_key}</Text>
              </View>
              {!highlightEnabled ? (
                <Text
                  style={[
                    styles.verseArabic,
                    {
                      fontSize: ARABIC_TYPOGRAPHY.fontSizeDisplay * textPreset.arabic,
                      lineHeight: ARABIC_TYPOGRAPHY.lineHeightDisplay * textPreset.arabic,
                    },
                  ]}
                >
                  {v.text_uthmani}
                </Text>
              ) : (
                <WordByWordArabic
                  text={v.text_uthmani}
                  isPlaying={activePlayback.playing && activePlayback.verseKey === v.verse_key}
                  progress={activePlayback.verseKey === v.verse_key ? activePlayback.progress : 0}
                  progressLead={0.16}
                  textStyle={[
                    styles.verseArabic,
                    {
                      fontSize: ARABIC_TYPOGRAPHY.fontSizeDisplay * textPreset.arabic,
                      lineHeight: ARABIC_TYPOGRAPHY.lineHeightDisplay * textPreset.arabic,
                    },
                  ]}
                />
              )}
              <Text
                style={[
                  styles.verseTranslation,
                  { fontSize: FONT_SIZE.sm * textPreset.body, lineHeight: 22 * textPreset.body },
                ]}
              >
                {translation || 'Translation unavailable for selected language.'}
              </Text>
              <View style={styles.audioInline}>
                <AudioPlayer
                  verseKey={v.verse_key}
                  compact
                  autoPlayToken={autoPlayTarget.verseKey === v.verse_key ? autoPlayTarget.token : 0}
                  onPlaybackStatusChange={(status) => {
                    if (status?.playing) {
                      setActivePlayback({
                        verseKey: v.verse_key,
                        playing: true,
                        progress: status?.progress ?? 0,
                      });
                    } else if (activePlayback.verseKey === v.verse_key) {
                      setActivePlayback((prev) => ({
                        ...prev,
                        playing: false,
                        progress: status?.progress ?? prev.progress,
                      }));
                    }

                    if (status?.didJustFinish) {
                      const currentIndex = verses.findIndex((item) => item.verse_key === v.verse_key);
                      const nextVerse = currentIndex >= 0 ? verses[currentIndex + 1] : null;
                      if (nextVerse?.verse_key) {
                        const nextToken = Date.now();
                        setAutoPlayTarget({ verseKey: nextVerse.verse_key, token: nextToken });
                        setActivePlayback({
                          verseKey: nextVerse.verse_key,
                          playing: true,
                          progress: 0,
                        });
                      } else {
                        setAutoPlayTarget({ verseKey: null, token: 0 });
                        setActivePlayback({ verseKey: null, playing: false, progress: 0 });
                      }
                    }
                  }}
                />
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* AI Summary */}
      {!loading && verses.length > 0 && (
        <View style={styles.summarySection}>
          {summary ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>✦ Page Summary</Text>
              <Markdown style={mdStyles}>{summary}</Markdown>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.summaryBtn}
              onPress={generateSummary}
              disabled={summaryLoading}
            >
              {summaryLoading ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <Text style={styles.summaryBtnText}>✦ Generate AI Summary</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Pagination */}
      {pagination && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            onPress={() => { setPage((p) => Math.max(1, p - 1)); setSummary(''); }}
            disabled={page <= 1}
          >
            <Text style={styles.pageBtnText}>← Previous</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>
            {page} / {pagination.total_pages}
          </Text>
          <TouchableOpacity
            style={[styles.pageBtn, page >= pagination.total_pages && styles.pageBtnDisabled]}
            onPress={() => { setPage((p) => Math.min(pagination.total_pages, p + 1)); setSummary(''); }}
            disabled={page >= pagination.total_pages}
          >
            <Text style={styles.pageBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.readerOptions}>
        <TouchableOpacity
          style={[styles.highlightToggle, highlightEnabled && styles.highlightToggleActive]}
          onPress={() => setHighlightEnabled((v) => !v)}
        >
          <Text style={[styles.highlightToggleText, highlightEnabled && styles.highlightToggleTextActive]}>
            {highlightEnabled ? 'Word Highlight: ON' : 'Word Highlight: OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ReadScreen({ navigation, route }) {
  const [view, setView] = useState('surahList');
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [progress, setProgress] = useState(null);
  const [mushafStartPage, setMushafStartPage] = useState(1);
  const [textPreset, setTextPreset] = useState({ arabic: 1, body: 1 });

  useEffect(() => {
    Promise.all([
      QuranRepository.getChapters(),
      storage.get(STORAGE_KEYS.READING_PROGRESS),
    ]).then(([data, prog]) => {
      setChapters(data.chapters ?? []);
      setProgress(prog);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      getTextSizePreset().then((p) => setTextPreset({ arabic: p.arabic, body: p.body }));
    }, []),
  );

  const applyInitialChapter = useCallback(() => {
    const requestedChapterId = route?.params?.initialChapterId;
    if (!requestedChapterId || chapters.length === 0) return;
    const chapter = chapters.find((c) => c.id === requestedChapterId);
    if (chapter) {
      void touchQuranLastReadChapter(chapter);
      setSelectedChapter(chapter);
      setView('verseReader');
      navigation.setParams?.({ initialChapterId: undefined });
    }
  }, [route?.params?.initialChapterId, chapters, navigation]);

  useEffect(() => {
    applyInitialChapter();
  }, [applyInitialChapter]);

  useFocusEffect(
    useCallback(() => {
      applyInitialChapter();
    }, [applyInitialChapter]),
  );

  const handleResumeReading = useCallback(async () => {
    if (progress?.readingLayout === 'mushaf' && progress?.mushafPage != null) {
      setMushafStartPage(Number(progress.mushafPage) || 1);
      setView('mushaf');
      return;
    }
    const cid = progress?.chapterId ?? progress?.surahId;
    if (!cid) return;
    const chapter = chapters.find((c) => c.id === cid);
    if (chapter) {
      void touchQuranLastReadChapter(chapter);
      setSelectedChapter(chapter);
      setView('verseReader');
    }
  }, [progress, chapters]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {view === 'surahList' ? (
        <SurahGrid
          chapters={chapters}
          onSelect={async (ch) => {
            await touchQuranLastReadChapter(ch);
            setSelectedChapter(ch);
            setView('verseReader');
          }}
          onOpenMushaf={() => {
            const p = Number(progress?.mushafPage);
            setMushafStartPage(Number.isFinite(p) && p >= 1 ? p : 1);
            setView('mushaf');
          }}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onBack={() => setView('surahList')}
          hasProgress={!!(progress?.chapterId ?? progress?.surahId ?? progress?.mushafPage)}
          progress={progress}
          onResumeReading={handleResumeReading}
        />
      ) : view === 'mushaf' ? (
        <MushafPageReader
          navigation={navigation}
          onBack={() => setView('surahList')}
          initialPage={mushafStartPage}
        />
      ) : (
        <VerseReader
          key={selectedChapter?.id ?? 'none'}
          chapter={selectedChapter}
          onBack={() => setView('surahList')}
          navigation={navigation}
          textPreset={textPreset}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },

  readerHeader: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  readerTitle: { color: COLORS.text, fontSize: FONT_SIZE.xxl + 4, fontWeight: '800', letterSpacing: 1 },
  readerSubtitle: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: 4 },

  resumeBanner: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.accentDim,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
  },
  resumeLabel: { color: COLORS.accent, fontSize: FONT_SIZE.xs, fontWeight: '600' },
  resumeDetail: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  resumeArrow: { color: COLORS.accent, fontSize: 18 },

  mushafEntry: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: `${COLORS.accent}35`,
  },
  mushafEntryTitle: { color: COLORS.accent, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  mushafEntrySub: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 4 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 42,
  },
  searchIcon: { color: COLORS.textFaint, fontSize: 18, marginRight: SPACING.xs },
  searchInput: { flex: 1, color: COLORS.text, fontSize: FONT_SIZE.sm },
  searchClear: { color: COLORS.textFaint, fontSize: 14, paddingLeft: SPACING.sm },

  surahGrid: { padding: SPACING.sm },
  surahTile: {
    flex: 1,
    margin: 4,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 2,
  },
  surahNumber: { color: COLORS.accent, fontSize: FONT_SIZE.xs, fontWeight: '700' },
  surahName: { color: COLORS.text, fontSize: FONT_SIZE.xs, fontWeight: '600', textAlign: 'center' },
  surahArabic: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs + 1, textAlign: 'center' },
  surahVerses: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs - 1 },

  verseReaderContent: { padding: SPACING.md },
  verseReaderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: { padding: SPACING.xs, marginRight: SPACING.xs },
  backIcon: { color: COLORS.text, fontSize: 22 },
  verseReaderTitle: { flex: 1 },
  surahTitle: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  surahTitleArabic: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  translationPickerBtn: {
    backgroundColor: COLORS.muted,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  translationPickerText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },

  translationList: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  translationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  translationOptionActive: { backgroundColor: COLORS.accentDim },
  translationOptionLang: {
    color: COLORS.textFaint,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    width: 28,
  },
  translationOptionLangActive: { color: COLORS.accent },
  translationOptionName: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },

  basmala: {
    fontSize: ARABIC_TYPOGRAPHY.fontSizeCompact,
    color: COLORS.accent,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: ARABIC_TYPOGRAPHY.lineHeightCompact,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },

  verseItem: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  verseItemHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  verseNumBadge: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentDim,
    borderWidth: 1,
    borderColor: `${COLORS.accent}50`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verseNumText: { color: COLORS.accent, fontSize: FONT_SIZE.xs, fontWeight: '700' },
  verseKeyLabel: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs },
  verseArabic: {
    fontSize: ARABIC_TYPOGRAPHY.fontSizeDisplay,
    color: COLORS.text,
    textAlign: 'right',
    lineHeight: ARABIC_TYPOGRAPHY.lineHeightDisplay,
    writingDirection: 'rtl',
  },
  verseTranslation: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, lineHeight: 22 },
  audioInline: { marginTop: SPACING.xs },

  summarySection: { marginTop: SPACING.sm, marginBottom: SPACING.md },
  summaryBtn: {
    backgroundColor: COLORS.accentDim,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
  },
  summaryBtnText: { color: COLORS.accent, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: `${COLORS.accent}30`,
  },
  summaryLabel: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },

  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  readerOptions: { marginTop: SPACING.sm, alignItems: 'flex-end' },
  highlightToggle: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.muted,
  },
  highlightToggleActive: {
    borderColor: `${COLORS.accent}40`,
    backgroundColor: COLORS.accentDim,
  },
  highlightToggleText: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs, fontWeight: '600' },
  highlightToggleTextActive: { color: COLORS.accent },
  pageBtn: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  pageInfo: { color: COLORS.textFaint, fontSize: FONT_SIZE.sm },
});

const mdStyles = {
  body: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, lineHeight: 22 },
  strong: { color: COLORS.text, fontWeight: '700' },
  bullet_list: { marginTop: 4 },
  list_item: { marginBottom: 2 },
};
