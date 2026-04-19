/**
 * VerseChat — React Native version.
 *
 * Adapted from web VerseChat.js:
 *  - React DOM → React Native primitives
 *  - CSS → StyleSheet
 *  - ReactMarkdown → react-native-markdown-display
 *  - Real streaming via ReadableStream (RN 0.73+ / Expo SDK 51+)
 *  - Chat history persisted in AsyncStorage per verseKey
 */

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { aiService } from '../lib/claude';
import storage, { STORAGE_KEYS } from '../lib/storage';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';
import { isVercelConfigured } from '../config';

const QUICK_STARTERS = [
  'What does this verse mean?',
  'How do I apply this today?',
  'What did scholars say?',
  'Find a related verse',
  'Why was this revealed?',
];

function ChatBubble({ message, isStreaming }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarText}>✦</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAI,
        ]}
      >
        {isUser ? (
          <Text style={styles.bubbleUserText}>{message.content}</Text>
        ) : (
          <Markdown style={markdownStyles}>{message.content}</Markdown>
        )}
        {isStreaming && <Text style={styles.cursor}>▋</Text>}
      </View>
    </View>
  );
}

function ThinkingDots() {
  return (
    <View style={styles.bubbleRow}>
      <View style={styles.aiAvatar}>
        <Text style={styles.aiAvatarText}>✦</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleAI, styles.thinkingBubble]}>
        <View style={styles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, { opacity: 0.4 + i * 0.2 }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

export default function VerseChat({ verseKey, arabicText, translation, tafsirText, chapterName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const listRef = useRef(null);

  // Load persisted chat history
  useEffect(() => {
    if (!verseKey) return;
    storage.get(STORAGE_KEYS.CHAT).then((all) => {
      const history = all?.[verseKey] ?? [];
      setMessages(history);
    });
  }, [verseKey]);

  const persistHistory = async (msgs) => {
    const all = (await storage.get(STORAGE_KEYS.CHAT)) ?? {};
    await storage.set(STORAGE_KEYS.CHAT, { ...all, [verseKey]: msgs });
  };

  const scrollToBottom = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    if (!isVercelConfigured()) {
      const errMsg = {
        role: 'assistant',
        content:
          'AI chat requires the Vercel backend to be configured. Update `API_BASE_URL` in `src/config.js` to your deployed Vercel URL.',
      };
      const newMsgs = [...messages, { role: 'user', content: trimmed }, errMsg];
      setMessages(newMsgs);
      await persistHistory(newMsgs);
      return;
    }

    const userMsg = { role: 'user', content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setStreaming(true);
    setIsThinking(true);
    setStreamingText('');
    scrollToBottom();

    try {
      await aiService.chatStream(
        updated,
        { verseKey, arabicText, translation, tafsirText, chapterName },
        (chunk) => {
          setIsThinking(false);
          setStreamingText(chunk);
          scrollToBottom();
        },
        async (finalText) => {
          const final = [...updated, { role: 'assistant', content: finalText }];
          setMessages(final);
          setStreamingText('');
          setStreaming(false);
          setIsThinking(false);
          await persistHistory(final);
          scrollToBottom();
        },
      );
    } catch (e) {
      const errMsgs = [
        ...updated,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ];
      setMessages(errMsgs);
      setStreaming(false);
      setIsThinking(false);
      await persistHistory(errMsgs);
    }
  };

  const clearHistory = async () => {
    setMessages([]);
    const all = (await storage.get(STORAGE_KEYS.CHAT)) ?? {};
    delete all[verseKey];
    await storage.set(STORAGE_KEYS.CHAT, all);
  };

  // Build the data array for FlatList
  const listData = [
    ...messages,
    ...(isThinking ? [{ role: '__thinking__', content: '' }] : []),
    ...(streaming && streamingText
      ? [{ role: '__streaming__', content: streamingText }]
      : []),
  ];

  const renderItem = ({ item }) => {
    if (item.role === '__thinking__') return <ThinkingDots />;
    if (item.role === '__streaming__')
      return <ChatBubble message={{ role: 'assistant', content: item.content }} isStreaming />;
    return <ChatBubble message={item} />;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={120}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>✦ Talk to this Verse</Text>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={listData}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Ask anything about this verse</Text>
            <View style={styles.startersGrid}>
              {QUICK_STARTERS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.starterChip}
                  onPress={() => sendMessage(q)}
                >
                  <Text style={styles.starterText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        onContentSizeChange={scrollToBottom}
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about this verse…"
          placeholderTextColor={COLORS.textFaint}
          multiline
          maxLength={500}
          editable={!streaming}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage(input)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || streaming) && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
        >
          {streaming ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.muted,
  },
  headerTitle: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  clearBtn: {},
  clearText: {
    color: COLORS.textFaint,
    fontSize: FONT_SIZE.xs,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: SPACING.md,
    gap: SPACING.sm,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    gap: SPACING.md,
  },
  emptyText: {
    color: COLORS.textFaint,
    fontSize: FONT_SIZE.xs,
  },
  startersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    justifyContent: 'center',
  },
  starterChip: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: `${COLORS.border}`,
    backgroundColor: COLORS.muted,
  },
  starterText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAI: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentDim,
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  aiAvatarText: {
    color: COLORS.accent,
    fontSize: 10,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm + 2,
  },
  bubbleUser: {
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    borderBottomRightRadius: RADIUS.sm,
  },
  bubbleAI: {
    backgroundColor: COLORS.muted,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: RADIUS.sm,
  },
  bubbleUserText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  },
  cursor: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.sm,
  },
  thinkingBubble: {
    paddingVertical: SPACING.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.muted,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    maxHeight: 100,
    paddingVertical: SPACING.xs,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
  sendIcon: {
    color: COLORS.accent,
    fontSize: 14,
  },
});

const markdownStyles = {
  body: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, lineHeight: 20 },
  strong: { color: COLORS.text, fontWeight: '700' },
  em: { fontStyle: 'italic' },
  bullet_list: { marginTop: 4 },
  list_item: { marginBottom: 2 },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    paddingLeft: SPACING.sm,
    marginLeft: 0,
    backgroundColor: COLORS.accentDim,
    borderRadius: RADIUS.sm,
    paddingVertical: 2,
  },
};
