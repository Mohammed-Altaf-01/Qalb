import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CONFIG, isVercelConfigured } from "../config";
import { COLORS, FONT_SIZE, RADIUS, SPACING } from "../theme";

export default function AhadithChaptersScreen({ navigation, route }) {
  const book = route.params?.book;
  const bookName = route.params?.name ?? book;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!book || !isVercelConfigured()) {
        setErr("Missing book or API_BASE_URL");
        setLoading(false);
        return;
      }
      try {
        const base = CONFIG.API_BASE_URL.replace(/\/$/, "");
        const res = await fetch(`${base}/api/hadith/chapters?book=${encodeURIComponent(book)}`);
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        if (cancelled) return;
        setData(json);
      } catch (e) {
        if (!cancelled) setErr(e?.message ?? "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ActivityIndicator size="large" color={COLORS.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const chapters = data?.chapters ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backTxt}>← Books</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{data?.name ?? bookName}</Text>
      <Text style={styles.sub}>{data?.edition ?? ""}</Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <FlatList
        data={chapters}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              navigation.navigate("AhadithSection", {
                book,
                bookName: data?.name ?? bookName,
                section: item.id,
                sectionTitle: item.title,
              })
            }
          >
            <Text style={styles.chTitle} numberOfLines={3}>
              {item.title}
            </Text>
            <Text style={styles.chMeta}>
              Section {item.id} · hadith {item.hadithFirst}–{item.hadithLast}
            </Text>
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
  title: { fontSize: FONT_SIZE.xl, fontWeight: "800", color: COLORS.text, paddingHorizontal: SPACING.md },
  sub: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  err: { color: "#f87171", paddingHorizontal: SPACING.md },
  list: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },
  row: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chTitle: { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: "600" },
  chMeta: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs, marginTop: 6 },
});
