/**
 * Tier-1 mushaf: readable RTL continuous flow + ayah markers (not web CSS parity).
 * Tier-2: refined badges / spacing toward web mushaf polish.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CONFIG, isVercelConfigured } from '../config';
import { getTextSizePreset } from '../lib/text-settings';
import { QuranRepository } from '../lib/quran-api';
import storage, { STORAGE_KEYS } from '../lib/storage';
import { schedulePushReadingProgress } from '../lib/user-app-sync';
import { ARABIC_TYPOGRAPHY, COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';

const TRANSLATIONS = [
  { id: 20, name: 'Saheeh International', lang: 'EN' },
  { id: 22, name: 'The Clear Quran', lang: 'EN' },
  { id: 85, name: 'Mufti Taqi Usmani', lang: 'UR' },
  { id: 234, name: 'Dr. Farhat Hashmi', lang: 'UR' },
];

function stripEndMarker(t = '') {
  return String(t).replace(/\u06dd[\d\u0660-\u0669]+\u06dd/g, '').trim();
}

export default function MushafPageReader({ navigation, onBack, initialPage = 1 }) {
  const [page, setPage] = useState(initialPage);

  useEffect(() => {
    setPage(initialPage);
  }, [initialPage]);
  const [translationId, setTranslationId] = useState(CONFIG.DEFAULT_TRANSLATION_ID);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [showTransPicker, setShowTransPicker] = useState(false);
  const [textPreset, setTextPreset] = useState({ arabic: 1, body: 1 });

  useEffect(() => {
    getTextSizePreset().then((p) => setTextPreset({ arabic: p.arabic, body: p.body }));
  }, []);

  const load = useCallback(async () => {
    if (!isVercelConfigured()) {
      setErr('Set API_BASE_URL for mushaf pages.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const data = await QuranRepository.getVersesByPageFromApp(page, translationId);
      const list = Array.isArray(data.verses) ? data.verses : [];
      setVerses(list);
      const first = list[0];
      if (first?.chapter_id) {
        await storage.merge(STORAGE_KEYS.READING_PROGRESS, {
          surahId: first.chapter_id,
          chapterId: first.chapter_id,
          verseNum: first.verse_number ?? 1,
          mushafPage: page,
          readingLayout: 'mushaf',
          translationId,
          updatedAt: Date.now(),
        });
        schedulePushReadingProgress();
      }
    } catch (e) {
      setErr(e?.message ?? 'Failed to load page');
      setVerses([]);
    } finally {
      setLoading(false);
    }
  }, [page, translationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const curTrans = TRANSLATIONS.find((t) => t.id === translationId);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={styles.title}>Mushaf</Text>
          <Text style={styles.sub}>Page {page} / 604</Text>
        </View>
        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowTransPicker((v) => !v)}>
          <Text style={styles.pickerTxt}>{curTrans?.lang ?? 'EN'} ▾</Text>
        </TouchableOpacity>
      </View>

      {showTransPicker ? (
        <View style={styles.pickerList}>
          {TRANSLATIONS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.pickerRow, t.id === translationId && styles.pickerRowOn]}
              onPress={() => {
                setTranslationId(t.id);
                setShowTransPicker(false);
              }}
            >
              <Text style={styles.pickerLang}>{t.lang}</Text>
              <Text style={styles.pickerName}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.pageNav}>
        <TouchableOpacity
          style={[styles.navBtn, page <= 1 && styles.navBtnOff]}
          disabled={page <= 1}
          onPress={() => setPage((p) => Math.max(1, p - 1))}
        >
          <Text style={styles.navBtnTxt}>← Prev</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, page >= 604 && styles.navBtnOff]}
          disabled={page >= 604}
          onPress={() => setPage((p) => Math.min(604, p + 1))}
        >
          <Text style={styles.navBtnTxt}>Next →</Text>
        </TouchableOpacity>
      </View>

      {err ? <Text style={styles.err}>{err}</Text> : null}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: SPACING.xl }} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
          <View style={styles.flow} accessibilityRole="text">
            {verses.map((verse, idx) => {
              const key = verse.verse_key ?? String(idx);
              const arabic = stripEndMarker(verse.text_uthmani ?? '');
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('VerseDetail', { verseKey: verse.verse_key })}
                  style={styles.verseWrap}
                >
                  <Text
                    style={[
                      styles.arabic,
                      {
                        fontSize: ARABIC_TYPOGRAPHY.fontSizeDisplay * textPreset.arabic * 1.05,
                        lineHeight: ARABIC_TYPOGRAPHY.lineHeightDisplay * textPreset.arabic * 1.05,
                      },
                    ]}
                  >
                    {arabic}
                  </Text>
                  {/* Tier-2: clearer ayah badge */}
                  <View style={styles.ayahBadge}>
                    <Text style={styles.ayahBadgeTxt}>{verse.verse_number ?? ''}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  backBtn: { padding: SPACING.xs },
  backIcon: { color: COLORS.text, fontSize: 22 },
  headerMid: { flex: 1 },
  title: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  sub: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  pickerBtn: {
    backgroundColor: COLORS.muted,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerTxt: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  pickerList: {
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerRowOn: { backgroundColor: COLORS.accentDim },
  pickerLang: { width: 28, fontWeight: '700', fontSize: FONT_SIZE.xs, color: COLORS.textFaint },
  pickerName: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  pageNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  navBtn: {
    backgroundColor: COLORS.card,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  navBtnOff: { opacity: 0.35 },
  navBtnTxt: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  err: { color: '#f87171', paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl },
  flow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    writingDirection: 'rtl',
  },
  verseWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    maxWidth: '100%',
    marginBottom: 2,
  },
  arabic: {
    color: COLORS.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ayahBadge: {
    marginHorizontal: 4,
    marginBottom: 4,
    minWidth: 22,
    height: 22,
    borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.accent}22`,
    borderWidth: 1,
    borderColor: `${COLORS.accent}55`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayahBadgeTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
  },
});
