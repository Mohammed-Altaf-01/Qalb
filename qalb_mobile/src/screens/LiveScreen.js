import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { VideoView, useVideoPlayer } from "expo-video";

import { CONFIG, isVercelConfigured } from "../config";
import { useMediaPlayback } from "../context/MediaPlaybackContext";
import { COLORS, FONT_SIZE, RADIUS, SPACING } from "../theme";

function LiveHlsPlayer({ url }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  return <VideoView style={styles.video} player={player} nativeControls contentFit="contain" />;
}

export default function LiveScreen() {
  const { stopAudio } = useMediaPlayback();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [activeUrl, setActiveUrl] = useState(null);
  const [activeName, setActiveName] = useState("");

  useEffect(() => {
    void stopAudio();
  }, [stopAudio]);

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
        const res = await fetch(`${base}/api/live/tv?language=eng`);
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data.channels) ? data.channels : [];
        setChannels(list);
        const def = list.find((c) => /quran|makkah|kaaba/i.test(c.name)) ?? list[0];
        if (def?.url) {
          setActiveUrl(def.url);
          setActiveName(def.name);
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message ?? "Failed to load channels");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pick = (c) => {
    if (c?.url) {
      setActiveUrl(c.url);
      setActiveName(c.name);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ActivityIndicator size="large" color={COLORS.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>Live</Text>
      <Text style={styles.sub}>{activeName || "Quran TV"}</Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {activeUrl ? <LiveHlsPlayer key={activeUrl} url={activeUrl} /> : <Text style={styles.empty}>No stream URL</Text>}
      <Text style={styles.h2}>Channels</Text>
      <FlatList
        data={channels}
        keyExtractor={(c) => String(c.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chList}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.chip, item.url === activeUrl && styles.chipOn]} onPress={() => pick(item)}>
            <Text style={styles.chipTxt} numberOfLines={2}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: "800",
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  sub: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  err: { color: "#f87171", paddingHorizontal: SPACING.md },
  video: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" },
  empty: { color: COLORS.textMuted, padding: SPACING.md },
  h2: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  chList: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: 8 },
  chip: {
    maxWidth: 140,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  chipOn: { borderColor: COLORS.accent, backgroundColor: COLORS.accentDim },
  chipTxt: { fontSize: FONT_SIZE.xs, color: COLORS.text },
});
