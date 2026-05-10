/**
 * HomeScreen — mirrors web `app/HomeClient.js` (no Hadith strip on mobile per product choice).
 * Recent reading chips, search, full surah list.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BookOpen, ChevronRight, Clock, Search, X } from 'lucide-react-native';

import { dedupeLastReadsByHref, MAX_QURAN_LAST_READS } from '../../../lib/qalb-last-reads';
import { QuranRepository } from '../lib/quran-api';
import { touchQuranLastReadChapter } from '../lib/quran-last-read-touch';
import storage, { STORAGE_KEYS } from '../lib/storage';
import useGamification from '../lib/useGamification';
import { ARABIC_TYPOGRAPHY, COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';

function normalizeTerm(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function surahIdFromLastReadHref(href) {
  if (!href) return null;
  const m = String(href).match(/[?&]surah=(\d+)/);
  return m ? Number(m[1]) : null;
}

export default function HomeScreen({ navigation }) {
  const { award } = useGamification();
  const [chapters, setChapters] = useState([]);
  const [lastReads, setLastReads] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const lastAwardedSearchRef = useRef('');
  const awardRef = useRef(award);
  awardRef.current = award;

  const loadLastReads = useCallback(async () => {
    const raw = (await storage.get(STORAGE_KEYS.QALB_LAST_READS)) ?? [];
    const saved = Array.isArray(raw) ? raw : [];
    setLastReads(dedupeLastReadsByHref(saved, MAX_QURAN_LAST_READS));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await QuranRepository.getChapters();
        if (!cancelled) setChapters(data?.chapters ?? []);
      } catch {
        if (!cancelled) setChapters([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLastReads();
    }, [loadLastReads]),
  );

  const filtered = useMemo(() => {
    const q = normalizeTerm(search);
    if (!q) return chapters;
    const tokens = q.split(' ').filter(Boolean);
    return [...chapters]
      .map((ch) => {
        const nameSimple = normalizeTerm(ch.name_simple);
        const translated = normalizeTerm(ch.translated_name?.name ?? '');
        const arabic = String(ch.name_arabic ?? '').trim();
        const id = String(ch.id);
        let score = 0;
        if (id === q) score += 120;
        if (nameSimple === q || translated === q || arabic === search.trim()) score += 90;
        if (nameSimple.startsWith(q) || translated.startsWith(q)) score += 60;
        if (nameSimple.includes(q) || translated.includes(q)) score += 35;
        if (arabic.includes(search.trim())) score += 50;
        for (const token of tokens) {
          if (token.length < 2) continue;
          if (nameSimple.includes(token)) score += 12;
          if (translated.includes(token)) score += 9;
          if (id.includes(token)) score += 8;
        }
        return { ch, score };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.ch.id - b.ch.id)
      .map((row) => row.ch);
  }, [chapters, search]);

  useEffect(() => {
    const q = normalizeTerm(search);
    if (q.length < 2 || filtered.length === 0) return;
    if (lastAwardedSearchRef.current === q) return;
    lastAwardedSearchRef.current = q;
    awardRef.current('thematic_search', { query: q });
  }, [search, filtered.length]);

  const onOpenChapter = async (chapter) => {
    await touchQuranLastReadChapter(chapter);
    navigation.navigate('Read', { initialChapterId: chapter.id });
  };

  const onOpenLastRead = async (r) => {
    const id = surahIdFromLastReadHref(r.href);
    if (id) {
      const ch = chapters.find((c) => c.id === id);
      if (ch) await touchQuranLastReadChapter(ch);
      navigation.navigate('Read', { initialChapterId: id });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingTxt}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {lastReads.length > 0 && (
          <View style={styles.mb}>
            <View style={styles.rowTitle}>
              <Clock size={13} color={COLORS.accent} opacity={0.7} />
              <Text style={styles.recentLabel}>Recent reading</Text>
            </View>
            <View style={styles.chipWrap}>
              {lastReads.map((r, i) => (
                <TouchableOpacity
                  key={`${r.href}#${r.type ?? 'read'}#${r.timestamp ?? i}`}
                  style={styles.chip}
                  onPress={() => onOpenLastRead(r)}
                  activeOpacity={0.75}
                >
                  <BookOpen size={13} color={COLORS.accent} opacity={0.6} />
                  <View style={styles.chipTextCol}>
                    <Text style={styles.chipLabel} numberOfLines={1}>
                      {r.label}
                    </Text>
                    {r.sub ? (
                      <Text style={styles.chipSub} numberOfLines={1}>
                        {r.sub}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.searchWrap}>
          <Search size={15} color={COLORS.textFaint} style={styles.searchLeading} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search surahs by name or number…"
            placeholderTextColor={COLORS.textFaint}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={12}>
              <X size={14} color={COLORS.textFaint} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.allSurahsHint}>All surahs</Text>

        <View style={styles.list}>
          {filtered.map((chapter) => (
            <TouchableOpacity
              key={chapter.id}
              style={styles.surahRow}
              onPress={() => onOpenChapter(chapter)}
              activeOpacity={0.75}
            >
              <View style={styles.idBadge}>
                <Text style={styles.idBadgeTxt}>{chapter.id}</Text>
              </View>
              <View style={styles.surahMid}>
                <View style={styles.nameRow}>
                  <Text style={styles.surahName}>{chapter.name_simple}</Text>
                </View>
                <Text style={styles.surahTranslated} numberOfLines={1}>
                  {chapter.translated_name?.name ?? ''}
                </Text>
              </View>
              <View style={styles.surahRight}>
                <Text style={styles.surahArabic} numberOfLines={1}>
                  {chapter.name_arabic}
                </Text>
                <Text style={styles.verseCount}>{chapter.verses_count} verses</Text>
              </View>
              <ChevronRight size={14} color={COLORS.textFaint} opacity={0.35} style={styles.chevron} />
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>No surahs found for &quot;{search}&quot;</Text>
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.emptyLink}>Clear search</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.lg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingTxt: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },

  mb: { marginBottom: SPACING.md + 4 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm },
  recentLabel: { fontSize: FONT_SIZE.xs, fontWeight: '500', color: COLORS.textMuted },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    maxWidth: '100%',
  },
  chipIcon: { flexShrink: 0 },
  chipTextCol: { minWidth: 0, maxWidth: 220 },
  chipLabel: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.text },
  chipSub: { fontSize: FONT_SIZE.xs - 2, color: COLORS.textFaint, marginTop: 2 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 10,
    marginBottom: SPACING.md,
  },
  searchLeading: { flexShrink: 0 },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    paddingVertical: 0,
    minHeight: 22,
  },

  allSurahsHint: {
    fontSize: FONT_SIZE.xs - 1,
    color: COLORS.textMuted,
    opacity: 0.7,
    marginBottom: SPACING.sm,
  },

  list: { gap: 2 },
  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 2,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  idBadge: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${COLORS.accent}4d`,
    backgroundColor: `${COLORS.accent}14`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  idBadgeTxt: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.accent },
  surahMid: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  surahName: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  surahTranslated: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, opacity: 0.55, marginTop: 2 },
  surahRight: { alignItems: 'flex-end', flexShrink: 0, maxWidth: '38%' },
  surahArabic: {
    fontSize: ARABIC_TYPOGRAPHY.fontSizeCompact - 2,
    lineHeight: ARABIC_TYPOGRAPHY.lineHeightCompact - 6,
    color: COLORS.text,
    opacity: 0.8,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  verseCount: { fontSize: FONT_SIZE.xs - 2, color: COLORS.textMuted, opacity: 0.45, marginTop: 2 },
  chevron: { flexShrink: 0 },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTxt: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center' },
  emptyLink: { marginTop: SPACING.sm, fontSize: FONT_SIZE.xs, color: COLORS.accent },
});
