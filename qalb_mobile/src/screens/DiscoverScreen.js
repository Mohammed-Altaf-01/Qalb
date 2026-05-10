/**
 * DiscoverScreen — "What's on your mind?" AI verse discovery.
 *
 * Mirrors web app /discover page.js:
 *  - Free-text input for user's life situation
 *  - Calls Vercel /api/ai/discover (Claude + Quran Foundation Search)
 *  - Shows 3 VerseCard results with AI explanation + audio + navigation
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appendDiscoverHistory } from '../../../lib/qalb-discover-history';

import { isVercelConfigured } from '../config';
import { aiService } from '../lib/claude';
import { emitJourneyLocalUpdated } from '../lib/qalb-events';
import useGamification from '../lib/useGamification';
import { QuranRepository } from '../lib/quran-api';
import { schedulePushLibraryBookmarks } from '../lib/user-app-sync';
import storage, { STORAGE_KEYS } from '../lib/storage';
import VerseCard from '../components/VerseCard';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';

const EXAMPLE_PROMPTS = [
  'I feel anxious about the future',
  'I lost someone dear to me',
  'I want to be more grateful',
  'I am struggling with patience',
  'I need strength to keep going',
];

export default function DiscoverScreen({ navigation }) {
  const { award } = useGamification();
  const [situation, setSituation] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [bookmarks, setBookmarks] = useState({});

  const loadBookmarks = async () => {
    const bm = (await storage.get(STORAGE_KEYS.BOOKMARKS)) ?? {};
    setBookmarks(bm);
  };

  const handleDiscover = async () => {
    const trimmed = situation.trim();
    if (!trimmed) return;

    if (!isVercelConfigured()) {
      setError(
        'AI Discover requires the Vercel backend. Update API_BASE_URL in src/config.js to your deployed Vercel URL.',
      );
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const { verses, success, error: aiError } = await aiService.discoverVerses(trimmed);
      if (!success || !verses?.length) {
        setError(aiError ?? 'No verses found. Try a different description.');
        return;
      }

      // Fetch full verse data for each returned verse key
      const verseData = await Promise.all(
        verses.map(async (v) => {
          try {
            const data = await QuranRepository.getVerseByKey(v.verse_key);
            const chapter = await QuranRepository.getChapter(
              v.verse_key.split(':')[0],
            ).catch(() => null);
            return {
              verse: data.verse,
              chapterName:
                chapter?.chapter?.name_simple ??
                chapter?.chapter?.translated_name?.name ??
                '',
              explanation: v.relevance_explanation,
              theme: v.theme,
            };
          } catch {
            return null;
          }
        }),
      );

      setResults(verseData.filter(Boolean));
      award('discover_search');
      const existingHist = await storage.get(STORAGE_KEYS.DISCOVER_HISTORY);
      const nextHist = appendDiscoverHistory(
        {
          situationSnippet: trimmed.slice(0, 200),
          verseKeys: verses.map((v) => v.verse_key).filter(Boolean),
          at: Date.now(),
        },
        existingHist,
      );
      await storage.set(STORAGE_KEYS.DISCOVER_HISTORY, nextHist);
      emitJourneyLocalUpdated();
      await loadBookmarks();
    } catch (e) {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async (verse, chapterName) => {
    const key = verse.verse_key;
    const bm = { ...bookmarks };
    if (bm[key]) {
      delete bm[key];
    } else {
      bm[key] = { verseKey: key, savedAt: Date.now(), chapterName };
    }
    await storage.set(STORAGE_KEYS.BOOKMARKS, bm);
    setBookmarks(bm);
    schedulePushLibraryBookmarks();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Discover</Text>
            <Text style={styles.subtitle}>Find verses that speak to your moment</Text>
          </View>

          {/* Input card */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>What's on your mind?</Text>
            <TextInput
              style={styles.input}
              value={situation}
              onChangeText={setSituation}
              placeholder="Describe what you're going through…"
              placeholderTextColor={COLORS.textFaint}
              multiline
              numberOfLines={4}
              maxLength={400}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{situation.length}/400</Text>

            {/* Example prompts */}
            {!situation && !loading && results.length === 0 && (
              <View style={styles.examples}>
                <Text style={styles.examplesLabel}>Try an example:</Text>
                <View style={styles.examplesGrid}>
                  {EXAMPLE_PROMPTS.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={styles.exampleChip}
                      onPress={() => setSituation(p)}
                    >
                      <Text style={styles.exampleText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.findBtn,
                (!situation.trim() || loading) && styles.findBtnDisabled,
              ]}
              onPress={handleDiscover}
              disabled={!situation.trim() || loading}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={styles.findBtnText}>Searching…</Text>
                </View>
              ) : (
                <Text style={styles.findBtnText}>◎  Find Verses</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Results */}
          {results.length > 0 && (
            <View style={styles.results}>
              <Text style={styles.resultsLabel}>
                {results.length} verse{results.length !== 1 ? 's' : ''} found for you
              </Text>
              {results.map((r) => (
                <VerseCard
                  key={r.verse?.verse_key}
                  verse={r.verse}
                  chapterName={r.chapterName}
                  explanation={r.explanation}
                  theme={r.theme}
                  isBookmarked={!!bookmarks[r.verse?.verse_key]}
                  onBookmark={() => toggleBookmark(r.verse, r.chapterName)}
                  onPress={() =>
                    navigation.navigate('VerseDetail', {
                      verseKey: r.verse?.verse_key,
                      chapterName: r.chapterName,
                    })
                  }
                />
              ))}
            </View>
          )}

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: SPACING.md },

  header: { marginBottom: SPACING.lg },
  title: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xxl + 4,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: 4 },

  inputCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    lineHeight: 24,
    minHeight: 100,
    backgroundColor: COLORS.muted,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  charCount: {
    color: COLORS.textFaint,
    fontSize: FONT_SIZE.xs,
    alignSelf: 'flex-end',
  },
  examples: { gap: SPACING.xs },
  examplesLabel: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs },
  examplesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  exampleChip: {
    backgroundColor: COLORS.muted,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exampleText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },

  findBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
  },
  findBtnDisabled: { opacity: 0.45 },
  findBtnText: { color: COLORS.white, fontSize: FONT_SIZE.md, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },

  errorBox: {
    backgroundColor: `${COLORS.danger}15`,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: `${COLORS.danger}30`,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.danger, fontSize: FONT_SIZE.sm },

  results: { gap: 0 },
  resultsLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
});
