import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mergeHadithVisit } from '../../../lib/last-hadith-reads';

import { CONFIG, isVercelConfigured } from '../config';
import { attachArabicToHadiths } from '../lib/hadith-arabic';
import { splitHadithSanad } from '../lib/hadith-sanad';
import storage, { STORAGE_KEYS } from '../lib/storage';
import { schedulePushReadingHistory } from '../lib/user-app-sync';
import useGamification from '../lib/useGamification';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';

export default function AhadithSectionScreen({ navigation, route }) {
  const { book, section, bookName, sectionTitle } = route.params ?? {};
  const { award } = useGamification();
  const [hadiths, setHadiths] = useState([]);
  const [title, setTitle] = useState(sectionTitle ?? '');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [awarded, setAwarded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!book || section == null || !isVercelConfigured()) {
        setErr('Missing params or API_BASE_URL');
        setLoading(false);
        return;
      }
      try {
        const base = CONFIG.API_BASE_URL.replace(/\/$/, '');
        const editionEn = `eng-${book}`;
        const editionAr = `ara-${book}`;
        const [resEn, resAr] = await Promise.all([
          fetch(`${base}/api/hadith/section?edition=${encodeURIComponent(editionEn)}&section=${encodeURIComponent(String(section))}`),
          fetch(`${base}/api/hadith/section?edition=${encodeURIComponent(editionAr)}&section=${encodeURIComponent(String(section))}`),
        ]);
        const en = await resEn.json();
        const ar = resAr.ok ? await resAr.json() : null;
        if (cancelled) return;
        if (!en?.hadiths?.length) {
          setErr('Section not found');
          setHadiths([]);
          return;
        }
        const merged = attachArabicToHadiths(en.hadiths, ar);
        setHadiths(merged);
        const st = en.metadata?.section?.[String(section)] ?? sectionTitle;
        if (st) setTitle(st);
      } catch (e) {
        if (!cancelled) setErr(e?.message ?? 'Failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book, section, sectionTitle]);

  useEffect(() => {
    if (awarded || !book || section == null || !title || hadiths.length === 0) return;
    let cancelled = false;
    (async () => {
      const href = `/ahadith/${book}/${section}`;
      const existing = (await storage.get(STORAGE_KEYS.LAST_HADITH_READS)) ?? [];
      const list = Array.isArray(existing) ? existing : [];
      const merged = mergeHadithVisit(list, {
        href,
        label: title,
        sub: bookName ?? book,
      });
      await storage.set(STORAGE_KEYS.LAST_HADITH_READS, merged);
      schedulePushReadingHistory();
      if (!cancelled) {
        setAwarded(true);
        award('hadith_explore');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [awarded, award, book, section, title, hadiths.length, bookName]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backTxt}>← Chapters</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>
        {bookName ?? book} · section {section}
      </Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <ScrollView contentContainerStyle={styles.list}>
        {hadiths.map((h) => {
          const english = splitHadithSanad(h.text, 'en');
          const arabic = splitHadithSanad(h.textArabic, 'ar');
          return (
            <View key={`${h.hadithnumber}-${h.reference?.hadith ?? ''}`} style={styles.card}>
              <Text style={styles.num}>Hadith {h.hadithnumber}</Text>
              {arabic.sanad ? (
                <Text style={styles.sanadAr} dir="rtl">
                  {arabic.sanad}
                </Text>
              ) : null}
              {h.textArabic ? (
                <Text style={styles.bodyAr} dir="rtl">
                  {arabic.body}
                </Text>
              ) : null}
              {english.sanad ? <Text style={styles.sanadEn}>{english.sanad}</Text> : null}
              <Text style={styles.bodyEn}>{english.body}</Text>
              {h.grades?.length > 0 ? (
                <Text style={styles.grade}>Grade: {h.grades.join(', ')}</Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  back: { paddingHorizontal: SPACING.md, paddingTop: SPACING.xs },
  backTxt: { color: COLORS.accent, fontSize: FONT_SIZE.sm },
  title: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, paddingHorizontal: SPACING.md },
  sub: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  err: { color: '#f87171', paddingHorizontal: SPACING.md },
  list: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  num: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.accent, marginBottom: SPACING.sm },
  sanadAr: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, textAlign: 'right', marginBottom: SPACING.xs, fontStyle: 'italic' },
  bodyAr: { color: COLORS.text, fontSize: FONT_SIZE.md, textAlign: 'right', marginBottom: SPACING.md, lineHeight: 24 },
  sanadEn: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginBottom: SPACING.xs, fontStyle: 'italic' },
  bodyEn: { color: COLORS.text, fontSize: FONT_SIZE.sm, lineHeight: 22 },
  grade: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs, marginTop: SPACING.sm },
});
