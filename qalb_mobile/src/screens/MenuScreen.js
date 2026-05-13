/**
 * Hub for Library, Goals, Settings, Profile, Listen, Live, Ahadith.
 */
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, FONT_SIZE, RADIUS, SPACING } from "../theme";

const ROWS = [
  { label: "Library", screen: "Library" },
  { label: "Goals", screen: "Goals" },
  { label: "Listen", screen: "Listen" },
  { label: "Live", screen: "Live" },
  { label: "Ahadith", screen: "AhadithBooks" },
  { label: "Profile", screen: "Profile" },
  { label: "Settings", screen: "Settings" },
];

export default function MenuScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.sub}>Library, audio, live TV, and account</Text>
        <View style={styles.list}>
          {ROWS.map((r) => (
            <TouchableOpacity
              key={r.screen}
              style={styles.row}
              onPress={() => navigation.navigate(r.screen)}
              activeOpacity={0.75}
            >
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Text style={styles.rowArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md },
  title: { fontSize: FONT_SIZE.xxl + 2, fontWeight: "800", color: COLORS.text },
  sub: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: 6, marginBottom: SPACING.lg },
  list: { gap: SPACING.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowLabel: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: "600" },
  rowArrow: { color: COLORS.accent, fontSize: 18 },
});
