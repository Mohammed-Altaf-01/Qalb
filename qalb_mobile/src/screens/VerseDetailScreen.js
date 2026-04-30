/**
 * VerseDetailScreen — Full verse experience with 4 tabs.
 *
 * Mirrors web app /verse/[verseKey]/VerseDetailClient.js:
 *  Tab 1 – Overview  : Arabic + typed translation + AudioPlayer + translation picker
 *  Tab 2 – Tafsir   : Switchable tafsir sources (8 available)
 *  Tab 3 – Reflect  : AI reflection questions + personal journal
 *  Tab 4 – Chat     : Full VerseChat component
 *
 * Data stored in AsyncStorage:
 *  - bookmarks (qalb_bookmarks)
 *  - reflections (qalb_reflections)
 *  - notes (qalb_notes)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useFocusEffect } from '@react-navigation/native';
import { CONFIG, isVercelConfigured } from '../config';
import { aiService } from '../lib/claude';
import { getTextSizePreset } from '../lib/text-settings';
import useGamification from '../lib/useGamification';
import { QuranRepository } from '../lib/quran-api';
import storage, { STORAGE_KEYS } from '../lib/storage';
import AudioPlayer from '../components/AudioPlayer';
import VerseChat from '../components/VerseChat';
import WordByWordArabic from '../components/WordByWordArabic';
import { ARABIC_TYPOGRAPHY, COLORS, FONT_SIZE, RADIUS, SHADOW, SPACING } from '../theme';

const TABS = ['Overview', 'Tafsir', 'Reflect', 'Chat'];

const TAFSIRS = [
  { id: 169, name: 'Ibn Kathir', lang: 'EN' },
  { id: 168, name: "Ma'arif al-Qur'an", lang: 'EN' },
  { id: 817, name: 'Tazkirul Quran', lang: 'EN' },
  { id: 160, name: 'Ibn Kathir', lang: 'UR' },
  { id: 159, name: 'Bayan ul Quran', lang: 'UR' },
  { id: 157, name: 'Fi Zilal al-Quran', lang: 'UR' },
  { id: 14, name: 'Ibn Kathir', lang: 'AR' },
  { id: 91, name: "Al-Sa'di", lang: 'AR' },
];

const TRANSLATIONS = [
  { id: 20, name: 'Saheeh International', lang: 'EN' },
  { id: 22, name: 'The Clear Quran', lang: 'EN' },
  { id: 97, name: 'Abdullah Yusuf Ali', lang: 'EN' },
  { id: 85, name: 'Mufti Taqi Usmani', lang: 'UR' },
  { id: 234, name: 'Dr. Farhat Hashmi', lang: 'UR' },
  { id: 162, name: 'Turkish Diyanet', lang: 'TR' },
  { id: 31, name: 'French Hamidullah', lang: 'FR' },
];

// ── Helper: strip HTML tags ───────────────────────────────────────────────────
function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────
function OverviewTab({ verse, chapterName, onTranslationChange, translationId, textPreset }) {
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);
  const [playback, setPlayback] = useState({ playing: false, progress: 0 });
  const arabicText = verse?.text_uthmani ?? '';
  const translation = verse?.translations?.[0]?.text
    ? stripHtml(verse.translations[0].text)
    : '';

  const currentTranslation = TRANSLATIONS.find((t) => t.id === translationId);

  return (
    <ScrollView
      style={styles.tabScroll}
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Arabic */}
      <View style={styles.arabicCard}>
        <WordByWordArabic
          text={arabicText}
          isPlaying={playback.playing}
          progress={playback.progress}
          textStyle={[
            styles.arabic,
            {
              fontSize: ARABIC_TYPOGRAPHY.fontSizeDisplay * textPreset.arabic,
              lineHeight: ARABIC_TYPOGRAPHY.lineHeightDisplay * textPreset.arabic,
            },
          ]}
        />
      </View>

      {/* Translation header */}
      <View style={styles.translationHeader}>
        <Text style={styles.translationLabel}>Translation</Text>
        <TouchableOpacity
          style={styles.translationPickerBtn}
          onPress={() => setShowTranslationPicker((v) => !v)}
        >
          <Text style={styles.translationPickerText}>
            {currentTranslation?.name ?? 'Saheeh Int.'} · {currentTranslation?.lang ?? 'EN'} ▾
          </Text>
        </TouchableOpacity>
      </View>

      {/* Translation picker */}
      {showTranslationPicker && (
        <View style={styles.pickerDropdown}>
          {TRANSLATIONS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.pickerOption, t.id === translationId && styles.pickerOptionActive]}
              onPress={() => {
                onTranslationChange(t.id);
                setShowTranslationPicker(false);
              }}
            >
              <Text style={[styles.pickerLang, t.id === translationId && styles.pickerLangActive]}>
                {t.lang}
              </Text>
              <Text style={styles.pickerName}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Translation text */}
      <View style={styles.translationCard}>
        <Text
          style={[
            styles.translationText,
            { fontSize: FONT_SIZE.md * textPreset.body, lineHeight: 26 * textPreset.body },
          ]}
        >
          {translation}
        </Text>
      </View>

      {/* Audio player */}
      {verse?.verse_key && (
        <View style={styles.audioWrapper}>
          <AudioPlayer verseKey={verse.verse_key} onPlaybackStatusChange={setPlayback} />
        </View>
      )}
    </ScrollView>
  );
}

// ── Tab: Tafsir ───────────────────────────────────────────────────────────────
function TafsirTab({ verseKey }) {
  const [tafsirId, setTafsirId] = useState(CONFIG.DEFAULT_TAFSIR_ID);
  const [tafsirText, setTafsirText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadTafsir();
  }, [verseKey, tafsirId]);

  const loadTafsir = async () => {
    setLoading(true);
    setTafsirText('');
    try {
      const data = await QuranRepository.getTafsirByVerse(verseKey, tafsirId);
      const raw = data?.tafsir?.text ?? data?.tafsirs?.[0]?.text ?? '';
      setTafsirText(stripHtml(raw));
    } catch {
      setTafsirText('Tafsir unavailable for this verse.');
    } finally {
      setLoading(false);
    }
  };

  const current = TAFSIRS.find((t) => t.id === tafsirId);

  return (
    <ScrollView
      style={styles.tabScroll}
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Tafsir selector */}
      <TouchableOpacity
        style={styles.selectorBtn}
        onPress={() => setShowPicker((v) => !v)}
      >
        <View>
          <Text style={styles.selectorLabel}>Tafsir Source</Text>
          <Text style={styles.selectorValue}>
            {current?.name ?? 'Ibn Kathir'} · {current?.lang ?? 'EN'} ▾
          </Text>
        </View>
      </TouchableOpacity>

      {showPicker && (
        <View style={styles.pickerDropdown}>
          {TAFSIRS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.pickerOption, t.id === tafsirId && styles.pickerOptionActive]}
              onPress={() => { setTafsirId(t.id); setShowPicker(false); setExpanded(false); }}
            >
              <Text style={[styles.pickerLang, t.id === tafsirId && styles.pickerLangActive]}>
                {t.lang}
              </Text>
              <Text style={styles.pickerName}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tafsir content */}
      <View style={styles.tafsirCard}>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.accent} />
        ) : (
          <>
            <Text
              style={[styles.tafsirText, !expanded && styles.tafsirCollapsed]}
              numberOfLines={expanded ? undefined : 8}
            >
              {tafsirText}
            </Text>
            <TouchableOpacity
              style={styles.expandBtn}
              onPress={() => setExpanded((v) => !v)}
            >
              <Text style={styles.expandBtnText}>
                {expanded ? '▲ Show less' : '▼ Read more'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ── Tab: Reflect ──────────────────────────────────────────────────────────────
function ReflectTab({ verse, tafsirSnippet, verseKey }) {
  const { award } = useGamification();
  const [questions, setQuestions] = useState([]);
  const [generatingQ, setGeneratingQ] = useState(false);
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    loadReflectData();
  }, [verseKey]);

  const loadReflectData = async () => {
    const allQ = (await storage.get(STORAGE_KEYS.REFLECTIONS)) ?? {};
    if (allQ[verseKey]) setQuestions(allQ[verseKey]);

    const allNotes = (await storage.get(STORAGE_KEYS.NOTES)) ?? {};
    if (allNotes[verseKey]) setNote(allNotes[verseKey].text ?? '');
  };

  const generateQuestions = async () => {
    if (!isVercelConfigured()) {
      Alert.alert(
        'Setup Required',
        'Configure API_BASE_URL in src/config.js to use AI reflection.',
      );
      return;
    }
    setGeneratingQ(true);
    try {
      const arabicText = verse?.text_uthmani ?? '';
      const translation = verse?.translations?.[0]?.text
        ? stripHtml(verse.translations[0].text)
        : '';
      const q = await aiService.generateReflectionPrompts(
        verseKey,
        arabicText,
        translation,
        tafsirSnippet,
      );
      setQuestions(q);
      const allQ = (await storage.get(STORAGE_KEYS.REFLECTIONS)) ?? {};
      await storage.set(STORAGE_KEYS.REFLECTIONS, { ...allQ, [verseKey]: q });
      award('generate_reflection');
    } catch {
      Alert.alert('Error', 'Could not generate questions. Please try again.');
    } finally {
      setGeneratingQ(false);
    }
  };

  const handleNoteChange = useCallback(async (text) => {
    setNote(text);
    setNoteSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const allNotes = (await storage.get(STORAGE_KEYS.NOTES)) ?? {};
      await storage.set(STORAGE_KEYS.NOTES, {
        ...allNotes,
        [verseKey]: { text, savedAt: Date.now() },
      });
      award('save_note');
      setNoteSaved(true);
    }, 800);
  }, [verseKey]);

  return (
    <ScrollView
      style={styles.tabScroll}
      contentContainerStyle={styles.tabContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Reflection questions */}
      <View style={styles.reflectSection}>
        <Text style={styles.reflectSectionTitle}>✦ Reflection Questions</Text>
        {questions.length > 0 ? (
          questions.map((q, i) => (
            <View key={i} style={styles.questionCard}>
              <Text style={styles.questionNum}>{i + 1}</Text>
              <Text style={styles.questionText}>{q}</Text>
            </View>
          ))
        ) : (
          <TouchableOpacity
            style={[styles.generateBtn, generatingQ && styles.generateBtnDisabled]}
            onPress={generateQuestions}
            disabled={generatingQ}
          >
            {generatingQ ? (
              <View style={styles.row}>
                <ActivityIndicator size="small" color={COLORS.accent} />
                <Text style={styles.generateBtnText}>Generating…</Text>
              </View>
            ) : (
              <Text style={styles.generateBtnText}>✦ Generate Reflection Questions</Text>
            )}
          </TouchableOpacity>
        )}
        {questions.length > 0 && (
          <TouchableOpacity
            style={styles.regenerateBtn}
            onPress={generateQuestions}
            disabled={generatingQ}
          >
            <Text style={styles.regenerateBtnText}>↺ Regenerate</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Personal journal */}
      <View style={styles.journalSection}>
        <View style={styles.journalHeader}>
          <Text style={styles.reflectSectionTitle}>✎ My Reflection</Text>
          {noteSaved && <Text style={styles.savedLabel}>Saved ✓</Text>}
        </View>
        <TextInput
          style={styles.journalInput}
          value={note}
          onChangeText={handleNoteChange}
          placeholder="Write your personal reflection here…"
          placeholderTextColor={COLORS.textFaint}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>
    </ScrollView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function VerseDetailScreen({ route, navigation }) {
  const { verseKey, chapterName: initialChapterName } = route.params ?? {};

  const [verse, setVerse] = useState(null);
  const [chapterName, setChapterName] = useState(initialChapterName ?? '');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [translationId, setTranslationId] = useState(CONFIG.DEFAULT_TRANSLATION_ID);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [tafsirSnippet, setTafsirSnippet] = useState('');
  const [textPreset, setTextPreset] = useState({ arabic: 1, body: 1 });

  useEffect(() => {
    loadVerse();
    checkBookmark();
  }, [verseKey]);

  useEffect(() => {
    if (translationId !== CONFIG.DEFAULT_TRANSLATION_ID && verseKey) {
      reloadTranslation();
    }
  }, [translationId]);

  useFocusEffect(
    useCallback(() => {
      getTextSizePreset().then((p) => setTextPreset({ arabic: p.arabic, body: p.body }));
    }, []),
  );

  const loadVerse = async () => {
    setLoading(true);
    try {
      const [verseData, chapterData] = await Promise.all([
        QuranRepository.getVerseByKey(verseKey, { translationId }),
        QuranRepository.getChapter(verseKey.split(':')[0]).catch(() => null),
      ]);
      setVerse(verseData.verse);
      const name =
        chapterData?.chapter?.name_simple ??
        chapterData?.chapter?.translated_name?.name ??
        chapterName;
      if (name) setChapterName(name);

      // Pre-load tafsir snippet for reflect tab
      QuranRepository.getTafsirByVerse(verseKey)
        .then((data) => {
          const raw = data?.tafsir?.text ?? '';
          setTafsirSnippet(stripHtml(raw).slice(0, 500));
        })
        .catch(() => {});
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const reloadTranslation = async () => {
    try {
      const data = await QuranRepository.getVerseByKey(verseKey, { translationId });
      setVerse(data.verse);
    } catch {}
  };

  const checkBookmark = async () => {
    const bm = (await storage.get(STORAGE_KEYS.BOOKMARKS)) ?? {};
    setIsBookmarked(!!bm[verseKey]);
  };

  const toggleBookmark = async () => {
    const bm = (await storage.get(STORAGE_KEYS.BOOKMARKS)) ?? {};
    if (bm[verseKey]) {
      delete bm[verseKey];
      setIsBookmarked(false);
    } else {
      bm[verseKey] = { verseKey, savedAt: Date.now(), chapterName };
      setIsBookmarked(true);
    }
    await storage.set(STORAGE_KEYS.BOOKMARKS, bm);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Sticky header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerKey}>{verseKey}</Text>
          {chapterName ? (
            <Text style={styles.headerChapter} numberOfLines={1}>{chapterName}</Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={toggleBookmark} style={styles.bookmarkBtn}>
          <Text style={[styles.bookmarkIcon, isBookmarked && styles.bookmarkActive]}>
            {isBookmarked ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        {activeTab === 'Overview' && verse && (
          <OverviewTab
            verse={verse}
            chapterName={chapterName}
            translationId={translationId}
            onTranslationChange={setTranslationId}
            textPreset={textPreset}
          />
        )}

        {activeTab === 'Tafsir' && (
          <TafsirTab verseKey={verseKey} />
        )}

        {activeTab === 'Reflect' && verse && (
          <ReflectTab
            verse={verse}
            tafsirSnippet={tafsirSnippet}
            verseKey={verseKey}
          />
        )}

        {activeTab === 'Chat' && verse && (
          <View style={styles.chatContainer}>
            <VerseChat
              verseKey={verseKey}
              arabicText={verse?.text_uthmani ?? ''}
              translation={stripHtml(verse?.translations?.[0]?.text ?? '')}
              tafsirText={tafsirSnippet}
              chapterName={chapterName}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
    gap: SPACING.sm,
  },
  backBtn: { padding: SPACING.xs },
  backIcon: { color: COLORS.text, fontSize: 22 },
  headerInfo: { flex: 1 },
  headerKey: { color: COLORS.accent, fontSize: FONT_SIZE.md, fontWeight: '700' },
  headerChapter: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 1 },
  bookmarkBtn: { paddingLeft: SPACING.sm },
  bookmarkIcon: { fontSize: 22, color: COLORS.textFaint },
  bookmarkActive: { color: COLORS.accent },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.xs,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: COLORS.accent },
  tabBtnText: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs, fontWeight: '500' },
  tabBtnTextActive: { color: COLORS.accent, fontWeight: '700' },

  tabScroll: { flex: 1 },
  tabContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },

  arabicCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  arabic: {
    fontSize: ARABIC_TYPOGRAPHY.fontSizeDisplay,
    color: COLORS.text,
    textAlign: 'right',
    lineHeight: ARABIC_TYPOGRAPHY.lineHeightDisplay,
    writingDirection: 'rtl',
    width: '100%',
  },

  translationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  translationLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  translationPickerBtn: {
    backgroundColor: COLORS.muted,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  translationPickerText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },

  pickerDropdown: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerOptionActive: { backgroundColor: COLORS.accentDim },
  pickerLang: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs, fontWeight: '700', width: 28 },
  pickerLangActive: { color: COLORS.accent },
  pickerName: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },

  translationCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  translationText: { color: COLORS.textMuted, fontSize: FONT_SIZE.md, lineHeight: 26 },

  audioWrapper: {},

  selectorBtn: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectorLabel: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs, textTransform: 'uppercase', letterSpacing: 1 },
  selectorValue: { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '600', marginTop: 2 },

  tafsirCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tafsirText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, lineHeight: 22 },
  tafsirCollapsed: {},
  expandBtn: { marginTop: SPACING.sm, alignSelf: 'center' },
  expandBtnText: { color: COLORS.accent, fontSize: FONT_SIZE.xs },

  reflectSection: { gap: SPACING.sm },
  reflectSectionTitle: { color: COLORS.accent, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  questionCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  questionNum: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    width: 20,
  },
  questionText: { flex: 1, color: COLORS.textMuted, fontSize: FONT_SIZE.sm, lineHeight: 22 },

  generateBtn: {
    backgroundColor: COLORS.accentDim,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: COLORS.accent, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  regenerateBtn: { alignSelf: 'flex-start' },
  regenerateBtnText: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },

  journalSection: { gap: SPACING.sm },
  journalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  savedLabel: { color: COLORS.success, fontSize: FONT_SIZE.xs },
  journalInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    lineHeight: 22,
    minHeight: 140,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlignVertical: 'top',
  },

  chatContainer: {
    flex: 1,
    margin: SPACING.sm,
    marginBottom: SPACING.md,
  },
});
