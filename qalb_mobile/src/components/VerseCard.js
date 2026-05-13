import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { getTextSizePreset } from "../lib/text-settings";
import { ARABIC_TYPOGRAPHY, COLORS, FONT_SIZE, RADIUS, SHADOW, SPACING } from "../theme";

/**
 * Reusable verse display card.
 *
 * Props:
 *  verse        — verse object from Quran Foundation API
 *  chapterName  — human-readable surah name
 *  onPress      — navigate to verse detail
 *  onBookmark   — toggle bookmark
 *  isBookmarked — bookmark state
 *  explanation  — AI relevance explanation (Discover screen)
 *  theme        — AI theme label (Discover screen)
 *  compact      — reduced padding for Library screen
 */
export default function VerseCard({
  verse,
  chapterName,
  onPress,
  onBookmark,
  isBookmarked = false,
  explanation,
  theme,
  compact = false,
}) {
  const [textPreset, setTextPreset] = useState({ arabic: 1, body: 1 });
  const arabicText = verse?.text_uthmani ?? "";
  const translation = verse?.translations?.[0]?.text?.replace(/<[^>]*>/g, "").trim() ?? "";
  const verseKey = verse?.verse_key ?? "";
  const verseNum = verse?.verse_number ?? "";

  useEffect(() => {
    getTextSizePreset().then((p) => setTextPreset({ arabic: p.arabic, body: p.body }));
  }, []);

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact, SHADOW]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.verseKeyBadge}>
          <Text style={styles.verseKeyText}>{verseKey}</Text>
        </View>
        {chapterName ? (
          <Text style={styles.chapterName} numberOfLines={1}>
            {chapterName}
          </Text>
        ) : null}
        {onBookmark ? (
          <TouchableOpacity
            style={styles.bookmarkBtn}
            onPress={onBookmark}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Text style={[styles.bookmarkIcon, isBookmarked && styles.bookmarkActive]}>{isBookmarked ? "★" : "☆"}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Arabic text */}
      {arabicText ? (
        <Text
          style={[
            styles.arabic,
            compact && styles.arabicCompact,
            {
              fontSize:
                (compact ? ARABIC_TYPOGRAPHY.fontSizeCompact : ARABIC_TYPOGRAPHY.fontSizeBody) * textPreset.arabic,
              lineHeight:
                (compact ? ARABIC_TYPOGRAPHY.lineHeightCompact : ARABIC_TYPOGRAPHY.lineHeightBody) * textPreset.arabic,
            },
          ]}
        >
          {arabicText}
        </Text>
      ) : null}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Translation */}
      {translation ? (
        <Text
          style={[
            styles.translation,
            compact && styles.translationCompact,
            {
              fontSize: (compact ? FONT_SIZE.xs + 1 : FONT_SIZE.sm) * textPreset.body,
              lineHeight: (compact ? 18 : 22) * textPreset.body,
            },
          ]}
          numberOfLines={compact ? 3 : 6}
        >
          {translation}
        </Text>
      ) : null}

      {/* AI explanation (Discover screen) */}
      {explanation ? (
        <View style={styles.explanationBox}>
          {theme ? (
            <View style={styles.themeBadge}>
              <Text style={styles.themeText}>{theme}</Text>
            </View>
          ) : null}
          <Text style={styles.explanationText}>{explanation}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  cardCompact: {
    padding: SPACING.sm + 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  verseKeyBadge: {
    backgroundColor: COLORS.primaryDim,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  verseKeyText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  chapterName: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  bookmarkBtn: {
    marginLeft: "auto",
    paddingLeft: SPACING.sm,
  },
  bookmarkIcon: {
    fontSize: 18,
    color: COLORS.textFaint,
  },
  bookmarkActive: {
    color: COLORS.accent,
  },
  arabic: {
    fontFamily: undefined, // system Arabic font (Geeza Pro on iOS, Noto Naskh on Android)
    color: COLORS.text,
    textAlign: "right",
    marginBottom: SPACING.sm,
    writingDirection: "rtl",
  },
  arabicCompact: {},
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  translation: {
    color: COLORS.textMuted,
  },
  translationCompact: {},
  explanationBox: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.accentDim,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: `${COLORS.accent}30`,
  },
  themeBadge: {
    alignSelf: "flex-start",
    backgroundColor: `${COLORS.accent}25`,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
  },
  themeText: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  explanationText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs + 1,
    lineHeight: 19,
    fontStyle: "italic",
  },
});
