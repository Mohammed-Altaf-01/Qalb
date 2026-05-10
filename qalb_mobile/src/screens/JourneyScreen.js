/**
 * Journey — mirrors web UserJourneyHistory: key themes, discover, reflect, chat.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  DeviceEventEmitter,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { ACCOUNT_STORAGE_SYNCED_EVENT, JOURNEY_LOCAL_UPDATED_EVENT } from '../lib/qalb-events';
import storage, { STORAGE_KEYS } from '../lib/storage';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';

function readKeyThemes(doc) {
  const map = doc?.themesBySurahId && typeof doc.themesBySurahId === 'object' ? doc.themesBySurahId : {};
  return Object.entries(map)
    .map(([surahId, row]) => ({
      surahId,
      surahName: typeof row?.surahName === 'string' ? row.surahName : `Surah ${surahId}`,
      updatedAt: typeof row?.updatedAt === 'number' ? row.updatedAt : 0,
      hasMarkdown: typeof row?.markdown === 'string' && row.markdown.length > 0,
    }))
    .filter((r) => r.hasMarkdown)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 12);
}

export default function JourneyScreen({ navigation }) {
  const [bump, setBump] = useState(0);
  const reload = useCallback(() => setBump((n) => n + 1), []);

  useEffect(() => {
    const s1 = DeviceEventEmitter.addListener(ACCOUNT_STORAGE_SYNCED_EVENT, reload);
    const s2 = DeviceEventEmitter.addListener(JOURNEY_LOCAL_UPDATED_EVENT, reload);
    return () => {
      s1.remove();
      s2.remove();
    };
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const [keyThemes, setKeyThemes] = useState([]);
  const [discovers, setDiscovers] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [chats, setChats] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ktDoc = (await storage.get(STORAGE_KEYS.READ_KEY_THEMES)) ?? {};
      const disc = (await storage.get(STORAGE_KEYS.DISCOVER_HISTORY)) ?? [];
      const refObj = (await storage.get(STORAGE_KEYS.REFLECTIONS)) ?? {};
      const chatObj = (await storage.get(STORAGE_KEYS.CHAT)) ?? {};
      if (cancelled) return;
      setKeyThemes(readKeyThemes(ktDoc));
      setDiscovers(Array.isArray(disc) ? disc.slice(0, 15) : []);
      setReflections(
        Object.entries(refObj)
          .filter(([, v]) => Array.isArray(v) && v.length > 0)
          .map(([verseKey]) => ({ verseKey }))
          .slice(0, 20),
      );
      setChats(
        Object.entries(chatObj)
          .filter(([, v]) => Array.isArray(v) && v.length > 0)
          .map(([verseKey]) => ({ verseKey }))
          .slice(0, 20),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [bump]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Journey</Text>
        <Text style={styles.sub}>Your reading, discovery, and reflection trail</Text>

        {keyThemes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key themes</Text>
            {keyThemes.map((r) => (
              <TouchableOpacity
                key={r.surahId}
                style={styles.row}
                onPress={() => navigation.navigate('Read', { screen: 'Read', params: { initialChapterId: Number(r.surahId) } })}
              >
                <Text style={styles.rowMain}>{r.surahName}</Text>
                <Text style={styles.rowSub}>Surah {r.surahId}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {discovers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Discover</Text>
            {discovers.map((d, i) => (
              <View key={`${d.at ?? i}-${d.situationSnippet?.slice(0, 12)}`} style={styles.card}>
                <Text style={styles.snippet}>{d.situationSnippet}</Text>
                <View style={styles.chips}>
                  {(d.verseKeys ?? []).map((k) => (
                    <TouchableOpacity key={k} style={styles.chip} onPress={() => navigation.navigate('VerseDetail', { verseKey: k })}>
                      <Text style={styles.chipTxt}>{k}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => navigation.navigate('Discover')}>
              <Text style={styles.link}>New search →</Text>
            </TouchableOpacity>
          </View>
        )}

        {reflections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reflect</Text>
            <View style={styles.wrap}>
              {reflections.map(({ verseKey }) => (
                <TouchableOpacity key={verseKey} style={styles.pill} onPress={() => navigation.navigate('VerseDetail', { verseKey })}>
                  <Text style={styles.pillTxt}>{verseKey}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {chats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verse chat</Text>
            <View style={styles.wrap}>
              {chats.map(({ verseKey }) => (
                <TouchableOpacity key={verseKey} style={styles.pill} onPress={() => navigation.navigate('VerseDetail', { verseKey })}>
                  <Text style={styles.pillTxt}>{verseKey}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {keyThemes.length === 0 && discovers.length === 0 && reflections.length === 0 && chats.length === 0 ? (
          <Text style={styles.empty}>Nothing here yet — read, discover, or open a verse to start your journey.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },
  title: { fontSize: FONT_SIZE.xxl + 2, fontWeight: '800', color: COLORS.text },
  sub: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: 6, marginBottom: SPACING.lg },
  section: { marginBottom: SPACING.lg },
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  row: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowMain: { color: COLORS.text, fontWeight: '600', fontSize: FONT_SIZE.sm },
  rowSub: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs, marginTop: 2 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  snippet: { color: COLORS.text, fontSize: FONT_SIZE.xs, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.sm },
  chip: {
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipTxt: { fontSize: 10, color: COLORS.accent, fontWeight: '600' },
  link: { color: COLORS.accent, fontSize: FONT_SIZE.xs, fontWeight: '600', marginTop: SPACING.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: COLORS.muted,
  },
  pillTxt: { fontSize: FONT_SIZE.xs, color: COLORS.text, fontWeight: '600' },
  empty: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, lineHeight: 22, marginTop: SPACING.md },
});
