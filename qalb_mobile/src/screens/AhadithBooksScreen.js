import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CONFIG, isVercelConfigured } from '../config';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';

export default function AhadithBooksScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isVercelConfigured()) {
        setErr('Set API_BASE_URL');
        setLoading(false);
        return;
      }
      try {
        const base = CONFIG.API_BASE_URL.replace(/\/$/, '');
        const res = await fetch(`${base}/api/hadith/books`);
        const data = await res.json();
        if (cancelled) return;
        setBooks(Array.isArray(data.books) ? data.books : []);
      } catch (e) {
        if (!cancelled) setErr(e?.message ?? 'Failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        <Text style={styles.backTxt}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Ahadith</Text>
      <Text style={styles.sub}>Books (English editions)</Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <FlatList
        data={books}
        keyExtractor={(b) => b.slug}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('AhadithChapters', { book: item.slug, name: item.name })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.sectionCount} sections · {item.edition}
              </Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  back: { paddingHorizontal: SPACING.md, paddingTop: SPACING.xs },
  backTxt: { color: COLORS.accent, fontSize: FONT_SIZE.sm },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.text, paddingHorizontal: SPACING.md },
  sub: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  err: { color: '#f87171', paddingHorizontal: SPACING.md },
  list: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  name: { color: COLORS.text, fontWeight: '700', fontSize: FONT_SIZE.md },
  meta: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs, marginTop: 4 },
  arrow: { color: COLORS.accent, fontSize: 18 },
});
