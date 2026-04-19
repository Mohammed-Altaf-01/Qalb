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
import Markdown from 'react-native-markdown-display';
import { CONFIG, isVercelConfigured } from '../config';
import { aiService } from '../lib/claude';
import { QuranRepository } from '../lib/quran-api';
import storage, { STORAGE_KEYS } from '../lib/storage';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';

const TRANSLATIONS = [
  { id: 20, name: 'Saheeh International', lang: 'EN' },
  { id: 22, name: 'The Clear Quran', lang: 'EN' },
  { id: 85, name: 'Mufti Taqi Usmani', lang: 'UR' },
  { id: 234, name: 'Dr. Farhat Hashmi', lang: 'UR' },
  { id: 162, name: 'Turkish Diyanet', lang: 'TR' },
  { id: 31, name: 'French Hamidullah', lang: 'FR' },
];

// ── Surah picker ──────────────────────────────────────────────────────────────

function SurahGrid({ chapters, onSelect, searchQuery, onSearch, onBack, hasProgress, progress, onResumeReading }) {
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
              {progress?.surahName ?? 'Surah'} · Page {progress?.page ?? 1}
            </Text>
          </View>
          <Text style={styles.resumeArrow}>→</Text>
        </TouchableOpacity>
      )}

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

function VerseReader({ chapter, onBack, navigation }) {
  const [verses, setVerses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [translationId, setTranslationId] = useState(CONFIG.DEFAULT_TRANSLATION_ID);
  const [loading, setLoading] = useState(true);
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [priorSummary, setPriorSummary] = useState('');

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
      setVerses(data.verses ?? []);
      setPagination(data.pagination ?? null);

      // Save reading progress
      await storage.merge(STORAGE_KEYS.READING_PROGRESS, {
        chapterId: chapter.id,
        surahName: chapter.name_simple,
        page,
        translationId,
        lastRead: Date.now(),
      });
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
          const t = v.translations?.[0]?.text?.replace(/<[^>]*>/g, '').trim() ?? '';
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
        <Text style={styles.basmala}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
      )}

      {/* Verses */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: SPACING.xl }} />
      ) : (
        verses.map((v) => {
          const translation = v.translations?.[0]?.text?.replace(/<[^>]*>/g, '').trim() ?? '';
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
              <Text style={styles.verseArabic}>{v.text_uthmani}</Text>
              <Text style={styles.verseTranslation}>{translation}</Text>
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

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ReadScreen({ navigation }) {
  const [view, setView] = useState('surahList');
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    Promise.all([
      QuranRepository.getChapters(),
      storage.get(STORAGE_KEYS.READING_PROGRESS),
    ]).then(([data, prog]) => {
      setChapters(data.chapters ?? []);
      setProgress(prog);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleResumeReading = useCallback(async () => {
    if (!progress?.chapterId) return;
    const chapter = chapters.find((c) => c.id === progress.chapterId);
    if (chapter) {
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
          onSelect={(ch) => { setSelectedChapter(ch); setView('verseReader'); }}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onBack={() => setView('surahList')}
          hasProgress={!!progress?.chapterId}
          progress={progress}
          onResumeReading={handleResumeReading}
        />
      ) : (
        <VerseReader
          chapter={selectedChapter}
          onBack={() => setView('surahList')}
          navigation={navigation}
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
    fontSize: 22,
    color: COLORS.accent,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 40,
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
    fontSize: FONT_SIZE.arabic,
    color: COLORS.text,
    textAlign: 'right',
    lineHeight: 48,
    writingDirection: 'rtl',
  },
  verseTranslation: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, lineHeight: 22 },

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
