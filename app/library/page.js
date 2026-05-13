/**
 * @fileoverview Library Page — Personal Bookmarks & Collections
 *
 * The user's personal Quran library — a curated space for verses
 * that resonated with them personally. Organized into two tabs:
 *
 *  Bookmarks   — individual saved verses (Quran Foundation Bookmarks API)
 *  Collections — user-named themed groups of verses (Collections API)
 *
 * For the demo, state is local. When the user authenticates via OAuth2,
 * all data persists to their Quran Foundation account.
 *
 * Design note: The library is intentionally minimal — it is a personal
 * space, not a discovery interface. Clean, calm, readable.
 */

"use client";

import { useEffect, useState } from "react";

import { BookMarked, BookOpen, FolderOpen, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ACCOUNT_STORAGE_SYNCED_EVENT,
  LS_LIBRARY_COLLECTIONS,
  schedulePushLibraryBookmarks,
  schedulePushLibraryCollections,
} from "@/lib/user-app-sync-bridge";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders a compact, tappable bookmark row in the bookmarks list.
 *
 * @param {object} props
 * @param {object} props.bookmark - { verseKey, arabicText, translation, chapterName }
 * @param {Function} props.onRemove
 */
function BookmarkRow({ bookmark, onRemove }) {
  return (
    <div className="flex items-start gap-3 py-3 group">
      {/* Verse info */}
      <div className="flex-1 min-w-0">
        <Link href={`/verse/${bookmark.verseKey}`} className="block hover:text-accent transition-colors">
          <p className="arabic-text-sm text-foreground/90 mb-1 truncate" lang="ar" dir="rtl">
            {bookmark.arabicText || "—"}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{bookmark.translation}</p>
        </Link>
        <Badge variant="outline" className="mt-1.5 text-[10px] px-1.5 py-0 border-border/50">
          {bookmark.chapterName} · {bookmark.verseKey}
        </Badge>
      </div>

      {/* Remove button — visible on hover */}
      <button
        onClick={() => onRemove(bookmark.verseKey)}
        className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0 p-1 mt-1"
        aria-label={`Remove bookmark for ${bookmark.verseKey}`}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

/**
 * Renders a single collection card — shows name, verse count, and
 * an expandable list of verses within it.
 *
 * @param {object} props
 * @param {object} props.collection
 * @param {Function} props.onDelete
 */
function CollectionCard({ collection, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Collection header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2.5 flex-1 text-left"
          aria-expanded={expanded}
        >
          <FolderOpen
            size={16}
            className={cn("transition-colors", expanded ? "text-accent" : "text-muted-foreground")}
          />
          <div>
            <p className="text-sm font-medium text-foreground">{collection.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {collection.verses.length} verse{collection.verses.length !== 1 ? "s" : ""}
            </p>
          </div>
        </button>

        <button
          onClick={() => onDelete(collection.id)}
          className="text-muted-foreground hover:text-destructive transition-colors p-1"
          aria-label={`Delete collection ${collection.name}`}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Expanded verse list */}
      {expanded && (
        <>
          <Separator className="bg-border/50" />
          <div className="px-4 py-2 space-y-2">
            {collection.verses.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No verses yet. Bookmark a verse and add it here.
              </p>
            ) : (
              collection.verses.map((verse) => (
                <Link
                  key={verse.verseKey}
                  href={`/verse/${verse.verseKey}`}
                  className="flex items-center gap-2 py-1.5 hover:text-accent transition-colors"
                >
                  <BookOpen size={11} className="text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground/80 truncate">
                    {verse.chapterName} · {verse.verseKey}
                  </span>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Library page — personal bookmarks and verse collections.
 */
export default function LibraryPage() {
  // ── State ──────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState("bookmarks"); // "bookmarks" | "collections"

  // Load bookmarks from localStorage (written by VerseDetailClient)
  const [bookmarks, setBookmarks] = useState([]);

  function loadBookmarksFromStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem("qalb_bookmarks") ?? "null");
      if (stored && typeof stored === "object") {
        setBookmarks(Object.values(stored).sort((a, b) => new Date(b.bookmarkedAt) - new Date(a.bookmarkedAt)));
      } else {
        setBookmarks([]);
      }
    } catch {
      setBookmarks([]);
    }
  }

  function loadCollectionsFromStorage() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_LIBRARY_COLLECTIONS) ?? "null");
      if (raw && Array.isArray(raw.collections)) {
        setCollections(raw.collections);
      }
    } catch {
      /* keep default */
    }
  }

  useEffect(() => {
    loadBookmarksFromStorage();
    loadCollectionsFromStorage();
  }, []);

  useEffect(() => {
    function onSync() {
      loadBookmarksFromStorage();
      loadCollectionsFromStorage();
    }
    window.addEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, onSync);
    return () => window.removeEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, onSync);
  }, []);

  /** Collections with their verse lists */
  const [collections, setCollections] = useState([]);

  /** New collection name input */
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Removes a bookmark from local state and localStorage. */
  const handleRemoveBookmark = (verseKey) => {
    setBookmarks((prev) => prev.filter((b) => b.verseKey !== verseKey));
    try {
      const stored = JSON.parse(localStorage.getItem("qalb_bookmarks") ?? "{}");
      delete stored[verseKey];
      localStorage.setItem("qalb_bookmarks", JSON.stringify(stored));
      schedulePushLibraryBookmarks();
    } catch {}
    toast("Bookmark removed.");
  };

  function persistCollections(cols) {
    try {
      const doc = { collections: cols, updatedAt: Date.now() };
      localStorage.setItem(LS_LIBRARY_COLLECTIONS, JSON.stringify(doc));
      schedulePushLibraryCollections();
    } catch {
      /* ignore */
    }
  }

  /** Creates a new empty collection. */
  const handleCreateCollection = () => {
    const name = newCollectionName.trim();
    if (!name) {
      toast.error("Please enter a collection name.");
      return;
    }
    setCollections((prev) => {
      const next = [{ id: Date.now().toString(), name, verses: [], updatedAt: Date.now() }, ...prev];
      persistCollections(next);
      return next;
    });
    setNewCollectionName("");
    setIsCreatingCollection(false);
    toast.success(`Collection "${name}" created.`);
  };

  /** Deletes a collection. */
  const handleDeleteCollection = (collectionId) => {
    setCollections((prev) => {
      const next = prev.filter((c) => c.id !== collectionId);
      persistCollections(next);
      return next;
    });
    toast("Collection deleted.");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-6">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookMarked size={20} className="text-accent" />
            My Library
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Your personal verse collection</p>
        </div>
      </div>

      {/* ── Tab Switcher ────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl bg-card border border-border/50 mb-6">
        {[
          { key: "bookmarks", label: `Bookmarks (${bookmarks.length})` },
          { key: "collections", label: `Collections (${collections.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex-1 text-xs font-medium py-2 rounded-lg transition-all",
              activeTab === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-selected={activeTab === key}
            role="tab"
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Bookmarks Tab ───────────────────────────────────────────────── */}
      {activeTab === "bookmarks" && (
        <div>
          {bookmarks.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">🔖</p>
              <p className="font-semibold text-foreground mb-1">No bookmarks yet</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                Use <span className="text-foreground/85">Bookmark</span> while reading or on a verse page to save it
                here.
              </p>
              <Link href="/discover">
                <Button size="sm" className="text-xs bg-primary hover:bg-primary/80">
                  Discover Verses
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {bookmarks.map((bookmark) => (
                <BookmarkRow key={bookmark.verseKey} bookmark={bookmark} onRemove={handleRemoveBookmark} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Collections Tab ─────────────────────────────────────────────── */}
      {activeTab === "collections" && (
        <div className="space-y-3">
          {/* Create collection */}
          {isCreatingCollection ? (
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Collection name (e.g. Verses of Comfort)"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateCollection()}
                className="text-sm bg-card border-border/60 flex-1"
                autoFocus
              />
              <Button
                size="sm"
                className="h-9 text-xs bg-primary hover:bg-primary/80 shrink-0"
                onClick={handleCreateCollection}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs shrink-0"
                onClick={() => setIsCreatingCollection(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs border-dashed h-10 mb-2"
              onClick={() => setIsCreatingCollection(true)}
            >
              <Plus size={13} className="mr-1.5" />
              New Collection
            </Button>
          )}

          {/* Collection cards */}
          {collections.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-4">📂</p>
              <p className="font-semibold text-foreground mb-1">No collections yet</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Create themed collections — e.g. &quot;Morning Adhkar&quot; or &quot;Verses of Gratitude&quot;.
              </p>
            </div>
          ) : (
            collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} onDelete={handleDeleteCollection} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
