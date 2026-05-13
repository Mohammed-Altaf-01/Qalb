import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CONFIG, isVercelConfigured } from "../config";
import { useMediaPlayback } from "../context/MediaPlaybackContext";
import { QuranRepository } from "../lib/quran-api";
import useGamification from "../lib/useGamification";
import { COLORS, FONT_SIZE, RADIUS, SPACING } from "../theme";

export default function ListenScreen() {
  const { award } = useGamification();
  const { playFromUri, stopAudio, currentLabel } = useMediaPlayback();
  const [chapters, setChapters] = useState([]);
  const [reciters, setReciters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isVercelConfigured()) {
        setErr("Set API_BASE_URL");
        setLoading(false);
        return;
      }
      try {
        const base = CONFIG.API_BASE_URL.replace(/\/$/, "");
        const [chRes, recRes] = await Promise.all([
          QuranRepository.getChapters(),
          fetch(`${base}/api/audio/reciters?language=eng`),
        ]);
        if (cancelled) return;
        setChapters(chRes.chapters ?? []);
        const jr = await recRes.json();
        const raw = Array.isArray(jr.reciters) ? jr.reciters : [];
        const parsed = raw
          .map((r) => {
            const moshaf = Array.isArray(r?.moshaf) ? r.moshaf : [];
            const preferred = moshaf.find((m) => Number(m?.moshaf_type) === 0) || moshaf[0];
            let server = String(preferred?.server ?? "").trim();
            if (server && !server.endsWith("/")) server = `${server}/`;
            const surahIds = Array.from(
              new Set(
                String(preferred?.surah_list ?? "")
                  .split(",")
                  .map((s) => parseInt(s.trim(), 10))
                  .filter((n) => Number.isFinite(n) && n >= 1 && n <= 114),
              ),
            ).sort((a, b) => a - b);
            return {
              id: Number(r?.id),
              name: String(r?.name ?? "").trim(),
              server,
              surahIds,
            };
          })
          .filter((r) => Number.isFinite(r.id) && r.name && r.server && r.surahIds.length > 0)
          .sort((a, b) => a.name.localeCompare(b.name));
        setReciters(parsed);
        if (parsed[0]) setSelectedId(parsed[0].id);
      } catch (e) {
        if (!cancelled) setErr(e?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => reciters.find((r) => r.id === selectedId) ?? reciters[0] ?? null,
    [reciters, selectedId],
  );

  const playable = useMemo(() => {
    if (!selected) return [];
    const allow = new Set(selected.surahIds);
    return chapters.filter((c) => allow.has(c.id));
  }, [selected, chapters]);

  const filteredReciters = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reciters;
    return reciters.filter((r) => r.name.toLowerCase().includes(q));
  }, [reciters, query]);

  async function playSurah(ch) {
    if (!selected) return;
    const filename = String(ch.id).padStart(3, "0");
    const url = `${selected.server}${filename}.mp3`;
    await playFromUri({ url, title: `${ch.name_simple} · ${selected.name}` });
    award("play_audio");
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ActivityIndicator size="large" color={COLORS.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>Listen</Text>
      <Text style={styles.sub}>Full surah MP3 by reciter</Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {currentLabel ? (
        <View style={styles.nowBar}>
          <Text style={styles.nowTxt} numberOfLines={1}>
            Now: {currentLabel}
          </Text>
          <TouchableOpacity onPress={stopAudio}>
            <Text style={styles.stopTxt}>Stop</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.h2}>Reciter</Text>
      <TextInput
        style={styles.search}
        placeholder="Search reciters…"
        placeholderTextColor={COLORS.textFaint}
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        horizontal
        data={filteredReciters}
        keyExtractor={(r) => String(r.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.recChip, item.id === selected?.id && styles.recChipOn]}
            onPress={() => setSelectedId(item.id)}
          >
            <Text style={[styles.recName, item.id === selected?.id && styles.recNameOn]} numberOfLines={2}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.h2}>Surahs</Text>
      <FlatList
        data={playable}
        keyExtractor={(c) => String(c.id)}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: 6 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.tile} onPress={() => playSurah(item)}>
            <Text style={styles.tileNum}>{item.id}</Text>
            <Text style={styles.tileName} numberOfLines={2}>
              {item.name_simple}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.md },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: "800", color: COLORS.text, marginTop: SPACING.sm },
  sub: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginBottom: SPACING.md },
  err: { color: "#f87171", marginBottom: SPACING.sm },
  nowBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nowTxt: { flex: 1, color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  stopTxt: { color: COLORS.accent, fontWeight: "700", fontSize: FONT_SIZE.sm },
  h2: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    marginBottom: SPACING.xs,
    textTransform: "uppercase",
  },
  search: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recRow: { paddingBottom: SPACING.md, gap: 8 },
  recChip: {
    maxWidth: 160,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  recChipOn: { borderColor: COLORS.accent, backgroundColor: COLORS.accentDim },
  recName: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  recNameOn: { color: COLORS.accent, fontWeight: "700" },
  grid: { paddingBottom: SPACING.xl * 3, gap: 6 },
  tile: {
    flex: 1,
    margin: 3,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 72,
  },
  tileNum: { color: COLORS.accent, fontWeight: "800", fontSize: FONT_SIZE.xs },
  tileName: { color: COLORS.text, fontSize: FONT_SIZE.xs - 1, marginTop: 4 },
});
