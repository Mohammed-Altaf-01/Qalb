/**
 * LibraryScreen — Bookmarks and Collections.
 * Mirrors web app /library page.js.
 * All data from AsyncStorage — no auth required.
 */
import { useCallback, useState } from "react";
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFocusEffect } from "@react-navigation/native";

import storage, { STORAGE_KEYS } from "../lib/storage";
import { schedulePushLibraryBookmarks, schedulePushLibraryCollections } from "../lib/user-app-sync";
import { COLORS, FONT_SIZE, RADIUS, SPACING } from "../theme";

const TABS = ["Bookmarks", "Collections"];

export default function LibraryScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("Bookmarks");
  const [bookmarks, setBookmarks] = useState([]);
  const [collections, setCollections] = useState([]);

  const loadData = useCallback(async () => {
    const bm = (await storage.get(STORAGE_KEYS.BOOKMARKS)) ?? {};
    setBookmarks(Object.values(bm).sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0)));
    let doc = await storage.get(STORAGE_KEYS.LIBRARY_COLLECTIONS);
    if (!doc && (await storage.getRaw("qalb_collections"))) {
      const legacyArr = await storage.get("qalb_collections");
      if (Array.isArray(legacyArr) && legacyArr.length) {
        doc = { collections: legacyArr, updatedAt: Date.now() };
        await storage.set(STORAGE_KEYS.LIBRARY_COLLECTIONS, doc);
      }
    }
    const normalized =
      doc && typeof doc === "object" && !Array.isArray(doc)
        ? doc
        : { collections: Array.isArray(doc) ? doc : [], updatedAt: 0 };
    setCollections(Array.isArray(normalized.collections) ? normalized.collections : []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const removeBookmark = useCallback(async (verseKey) => {
    Alert.alert("Remove Bookmark", "Remove this verse from bookmarks?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const bm = (await storage.get(STORAGE_KEYS.BOOKMARKS)) ?? {};
          delete bm[verseKey];
          await storage.set(STORAGE_KEYS.BOOKMARKS, bm);
          schedulePushLibraryBookmarks();
          loadData();
        },
      },
    ]);
  }, []);

  const persistCollections = useCallback(
    async (cols) => {
      await storage.set(STORAGE_KEYS.LIBRARY_COLLECTIONS, {
        collections: cols,
        updatedAt: Date.now(),
      });
      schedulePushLibraryCollections();
      await loadData();
    },
    [loadData],
  );

  const promptCreateCollection = useCallback(() => {
    const add = async (name) => {
      const trimmed = typeof name === "string" ? name.trim() : "";
      if (!trimmed) return;
      const cols = [...collections];
      cols.push({
        id: `${Date.now()}`,
        name: trimmed,
        verses: [],
        updatedAt: Date.now(),
      });
      await persistCollections(cols);
    };
    if (Platform.OS === "ios") {
      Alert.prompt("Collection name", "Group verses around a theme or topic.", [
        { text: "Cancel", style: "cancel" },
        { text: "Create", onPress: (txt) => void add(txt ?? "") },
      ]);
    } else {
      void add(`Collection ${collections.length + 1}`);
    }
  }, [collections, persistCollections]);

  const renderBookmark = ({ item }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("VerseDetail", {
          verseKey: item.verseKey,
          chapterName: item.chapterName ?? "",
        })
      }
    >
      <View style={styles.bookmarkItem}>
        <View style={styles.bookmarkInfo}>
          <Text style={styles.bookmarkKey}>{item.verseKey}</Text>
          {item.chapterName ? <Text style={styles.bookmarkChapter}>{item.chapterName}</Text> : null}
          {item.savedAt ? <Text style={styles.bookmarkDate}>{new Date(item.savedAt).toLocaleDateString()}</Text> : null}
        </View>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => removeBookmark(item.verseKey)}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Text style={styles.removeIcon}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.subtitle}>Your saved verses</Text>
      </View>

      {/* Tab selector */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
              {tab === "Bookmarks" && bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === "Bookmarks" && (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.verseKey}
          renderItem={renderBookmark}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>☆</Text>
              <Text style={styles.emptyTitle}>No bookmarks yet</Text>
              <Text style={styles.emptySubtitle}>Tap ☆ on any verse to save it here</Text>
            </View>
          }
        />
      )}

      {activeTab === "Collections" && (
        <View style={styles.collectionsContainer}>
          {collections.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>◇</Text>
              <Text style={styles.emptyTitle}>No collections yet</Text>
              <Text style={styles.emptySubtitle}>Collections let you group verses by theme</Text>
              <TouchableOpacity style={styles.createBtn} onPress={promptCreateCollection}>
                <Text style={styles.createBtnText}>+ Create Collection</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={collections}
              keyExtractor={(item) => String(item.id ?? item.name)}
              renderItem={({ item }) => (
                <View style={styles.collectionCard}>
                  <Text style={styles.collectionName}>{item.name}</Text>
                  <Text style={styles.collectionCount}>{item.verses?.length ?? 0} verses</Text>
                </View>
              )}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  title: { color: COLORS.text, fontSize: FONT_SIZE.xxl + 4, fontWeight: "800", letterSpacing: 1 },
  subtitle: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: 4 },

  tabBar: {
    flexDirection: "row",
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.muted,
    borderRadius: RADIUS.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.xs + 2,
    alignItems: "center",
    borderRadius: RADIUS.sm,
  },
  tabActive: { backgroundColor: COLORS.card },
  tabText: { color: COLORS.textFaint, fontSize: FONT_SIZE.sm, fontWeight: "500" },
  tabTextActive: { color: COLORS.text, fontWeight: "700" },

  listContent: { padding: SPACING.md, paddingTop: 0, gap: SPACING.xs },

  bookmarkItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xs,
  },
  bookmarkInfo: { flex: 1, gap: 2 },
  bookmarkKey: { color: COLORS.accent, fontSize: FONT_SIZE.md, fontWeight: "700" },
  bookmarkChapter: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  bookmarkDate: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs },
  removeBtn: { paddingLeft: SPACING.md },
  removeIcon: { color: COLORS.textFaint, fontSize: 14 },

  empty: {
    alignItems: "center",
    paddingTop: SPACING.xxl,
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  emptyIcon: { fontSize: 40, color: COLORS.textFaint },
  emptyTitle: { color: COLORS.textMuted, fontSize: FONT_SIZE.lg, fontWeight: "600" },
  emptySubtitle: {
    color: COLORS.textFaint,
    fontSize: FONT_SIZE.sm,
    textAlign: "center",
    lineHeight: 20,
  },

  collectionsContainer: { flex: 1 },
  createBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primaryDim,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  createBtnText: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: "600" },

  collectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  collectionName: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: "600" },
  collectionCount: { color: COLORS.textFaint, fontSize: FONT_SIZE.xs },
});
