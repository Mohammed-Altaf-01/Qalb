/**
 * Gamification engine — XP, levels, badges, and daily challenges.
 *
 * All state is persisted in localStorage, keyed by userId so it survives
 * sign-out/sign-in and is isolated per account on the same device.
 *
 * Design: pure functions that operate on a plain state object, plus
 * thin localStorage helpers so components just call awardXP() and read state.
 */
import {
  DEED_THRESHOLDS_MINUTES,
  GAMIFICATION_ACTION_LOG_LIMIT,
  MS_PER_DAY,
  TIME_SPENT_XP_DIVISOR,
} from "@/lib/constants/gamification";

// ─────────────────────────────────────────────────────────────────────────────
// Levels
// ─────────────────────────────────────────────────────────────────────────────

export const LEVELS = [
  { level: 1, icon: "🌱", title: "Seeker", titleAr: "طالب", minXp: 0, color: "text-slate-400", bg: "bg-slate-400/10" },
  { level: 2, icon: "📖", title: "Reader", titleAr: "قارئ", minXp: 100, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { level: 3, icon: "🧠", title: "Student", titleAr: "طالب علم", minXp: 300, color: "text-sky-400", bg: "bg-sky-400/10" },
  { level: 4, icon: "🎓", title: "Scholar", titleAr: "عالم", minXp: 700, color: "text-violet-400", bg: "bg-violet-400/10" },
  { level: 5, icon: "📿", title: "Hafiz", titleAr: "حافظ", minXp: 1500, color: "text-amber-400", bg: "bg-amber-400/10" },
  { level: 6, icon: "🕌", title: "Imam", titleAr: "إمام", minXp: 3000, color: "text-yellow-400", bg: "bg-yellow-400/10" },
];

export function getLevelInfo(xp) {
  let current = LEVELS[0];
  let next = LEVELS[1];

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
      break;
    }
  }

  const xpIntoLevel = xp - current.minXp;
  const xpNeeded = next ? next.minXp - current.minXp : 0;
  const progress = next ? Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100)) : 100;

  return { current, next, xpIntoLevel, xpNeeded, progress };
}

// ─────────────────────────────────────────────────────────────────────────────
// XP Actions
// ─────────────────────────────────────────────────────────────────────────────

export const XP_ACTIONS = {
  daily_login: { xp: 10, label: "Daily login" },
  read_verse_page: { xp: 5, label: "Read a page" },
  play_audio: { xp: 3, label: "Listened to recitation" },
  bookmark_verse: { xp: 5, label: "Bookmarked a verse" },
  generate_reflection: { xp: 10, label: "Generated reflections" },
  save_note: { xp: 15, label: "Saved a reflection" },
  chat_message: { xp: 8, label: "Talked to a verse" },
  discover_search: { xp: 5, label: "Discovered verses" },
  complete_goal: { xp: 50, label: "Completed a goal" },
  streak_3: { xp: 20, label: "3-day streak bonus" },
  streak_7: { xp: 50, label: "7-day streak bonus" },
  streak_30: { xp: 150, label: "30-day streak bonus" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Badges
// ─────────────────────────────────────────────────────────────────────────────

export const BADGES = {
  first_bookmark: { id: "first_bookmark", icon: "🔖", title: "First Bookmark", desc: "Saved your first verse", xp: 10 },
  first_note: { id: "first_note", icon: "✍️", title: "Reflective", desc: "Wrote your first reflection note", xp: 15 },
  first_chat: {
    id: "first_chat",
    icon: "💬",
    title: "Conversationalist",
    desc: "Had your first conversation with a verse",
    xp: 15,
  },
  first_discover: {
    id: "first_discover",
    icon: "🔍",
    title: "Seeker",
    desc: "Used AI discovery for the first time",
    xp: 10,
  },
  first_goal: { id: "first_goal", icon: "🎯", title: "Goal Setter", desc: "Created your first reading goal", xp: 20 },
  streak_3: { id: "streak_3", icon: "🔥", title: "On Fire", desc: "Maintained a 3-day reading streak", xp: 20 },
  streak_7: { id: "streak_7", icon: "⚡", title: "Devoted", desc: "Maintained a 7-day reading streak", xp: 50 },
  streak_30: { id: "streak_30", icon: "🌟", title: "Committed", desc: "Maintained a 30-day reading streak", xp: 150 },
  reflective_5: {
    id: "reflective_5",
    icon: "🤔",
    title: "Deep Thinker",
    desc: "Generated reflections on 5 different verses",
    xp: 30,
  },
  notes_10: { id: "notes_10", icon: "📖", title: "Journaler", desc: "Written 10 personal reflection notes", xp: 40 },
  discover_5: { id: "discover_5", icon: "🧭", title: "Explorer", desc: "Used AI discovery 5 times", xp: 25 },
  night_owl: {
    id: "night_owl",
    icon: "🌙",
    title: "Night Worshipper",
    desc: "Engaged with the Quran after midnight",
    xp: 20,
  },
  early_bird: {
    id: "early_bird",
    icon: "🌅",
    title: "Fajr Reader",
    desc: "Engaged with the Quran before 6 AM",
    xp: 20,
  },
  read_10_surahs: {
    id: "read_10_surahs",
    icon: "📚",
    title: "Surah Explorer",
    desc: "Read verses from 10 different surahs",
    xp: 35,
  },
  complete_goal: {
    id: "complete_goal",
    icon: "✅",
    title: "Goal Achiever",
    desc: "Completed your first reading goal",
    xp: 50,
  },
  level_scholar: {
    id: "level_scholar",
    icon: "🎓",
    title: "Scholar Rank",
    desc: "Reached Scholar level (700 XP)",
    xp: 0,
  },
  level_hafiz: { id: "level_hafiz", icon: "📿", title: "Hafiz Rank", desc: "Reached Hafiz level (1500 XP)", xp: 0 },
  level_imam: { id: "level_imam", icon: "🕌", title: "Imam Rank", desc: "Reached Imam level (3000 XP)", xp: 0 },
};

export const DEEDS = {
  minutes_15: { id: "minutes_15", icon: "⏱️", title: "Steady Presence", desc: "Spent 15 minutes in the app", xp: 15 },
  minutes_60: { id: "minutes_60", icon: "🕊️", title: "Heartful Hour", desc: "Spent 60 minutes in the app", xp: 40 },
  minutes_180: { id: "minutes_180", icon: "🌙", title: "Consistent Devotion", desc: "Spent 3 hours in the app", xp: 90 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Daily Challenges
// ─────────────────────────────────────────────────────────────────────────────

const CHALLENGE_POOL = [
  {
    id: "read_daily_verse",
    title: "Read the Daily Verse",
    desc: "Visit and read today's featured verse",
    xp: 15,
    action: "read_verse_page",
  },
  {
    id: "reflect_on_verse",
    title: "Reflect on a Verse",
    desc: "Generate AI reflections on any verse",
    xp: 20,
    action: "generate_reflection",
  },
  {
    id: "listen_recitation",
    title: "Listen to a Recitation",
    desc: "Play the audio for any verse",
    xp: 15,
    action: "play_audio",
  },
  {
    id: "discover_verse",
    title: "Discover with AI",
    desc: "Use 'What's on your mind?' to find a verse",
    xp: 20,
    action: "discover_search",
  },
  {
    id: "save_reflection",
    title: "Write a Reflection",
    desc: "Save a personal note on any verse",
    xp: 25,
    action: "save_note",
  },
  {
    id: "chat_verse",
    title: "Talk to a Verse",
    desc: "Have a conversation about any verse",
    xp: 20,
    action: "chat_message",
  },
  {
    id: "bookmark_something",
    title: "Save a Verse",
    desc: "Bookmark a verse that moves you today",
    xp: 15,
    action: "bookmark_verse",
  },
];

/** Returns today's challenge — deterministic based on date */
export function getDailyChallenge() {
  const dayIndex = Math.floor(Date.now() / MS_PER_DAY);
  return CHALLENGE_POOL[dayIndex % CHALLENGE_POOL.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage state management
// ─────────────────────────────────────────────────────────────────────────────

function storageKey(userId) {
  return `qalb_gamification_${userId}`;
}

function defaultState() {
  return {
    xp: 0,
    badges: [], // array of badge IDs earned
    badgeLog: [], // { id, earnedAt } for history
    actionLog: [], // { action, xp, timestamp } — last 50 entries
    actionsToday: {}, // { actionKey: count } — resets daily
    todayKey: null, // "YYYY-MM-DD" — used to detect day rollover
    surahs_read: [], // surah numbers read
    discovers_count: 0,
    reflections_count: 0,
    notes_count: 0,
    challenge_completed: false,
    challenge_date: null,
    total_minutes_spent: 0,
    deeds: [],
    deedLog: [],
  };
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}

export function loadState(userId) {
  if (typeof window === "undefined" || !userId) return defaultState();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const state = raw ? JSON.parse(raw) : defaultState();
    // Reset daily counters on new day
    if (state.todayKey !== todayString()) {
      state.actionsToday = {};
      state.todayKey = todayString();
      state.challenge_completed = false;
    }
    state.deeds = state.deeds ?? [];
    state.deedLog = state.deedLog ?? [];
    state.total_minutes_spent = state.total_minutes_spent ?? 0;
    return state;
  } catch {
    return defaultState();
  }
}

export function saveState(userId, state) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: award XP + check badges
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Award XP for an action. Returns { xpGained, newBadges, leveledUp, newLevel }.
 * Caller is responsible for saving state back with saveState().
 */
export function awardXP(state, actionKey, metadata = {}) {
  const action = XP_ACTIONS[actionKey];
  if (!action) return { xpGained: 0, newBadges: [], leveledUp: false };

  const prevLevel = getLevelInfo(state.xp).current.level;

  // Award XP
  state.xp += action.xp;
  state.actionLog = [
    { action: actionKey, xp: action.xp, label: action.label, timestamp: Date.now() },
    ...(state.actionLog ?? []),
  ].slice(0, GAMIFICATION_ACTION_LOG_LIMIT);

  // Track per-action counters
  state.actionsToday = state.actionsToday ?? {};
  state.actionsToday[actionKey] = (state.actionsToday[actionKey] ?? 0) + 1;

  // Update metadata counters
  if (actionKey === "discover_search") state.discovers_count = (state.discovers_count ?? 0) + 1;
  if (actionKey === "generate_reflection") state.reflections_count = (state.reflections_count ?? 0) + 1;
  if (actionKey === "save_note") state.notes_count = (state.notes_count ?? 0) + 1;
  if (metadata.surahNumber && !state.surahs_read.includes(metadata.surahNumber)) {
    state.surahs_read.push(metadata.surahNumber);
  }

  // Mark challenge complete
  const challenge = getDailyChallenge();
  if (!state.challenge_completed && challenge.action === actionKey) {
    state.challenge_completed = true;
    state.challenge_date = todayString();
    state.xp += challenge.xp; // bonus XP for completing daily challenge
  }

  // Check for new badges
  const newBadges = checkBadges(state);

  // Check level up
  const newLevel = getLevelInfo(state.xp).current.level;
  const leveledUp = newLevel > prevLevel;

  return { xpGained: action.xp, newBadges, leveledUp, newLevel: leveledUp ? getLevelInfo(state.xp).current : null };
}

export function awardTimeSpent(state, minutes = 1) {
  if (!minutes || minutes <= 0) return { xpGained: 0, newDeeds: [] };

  state.total_minutes_spent = (state.total_minutes_spent ?? 0) + minutes;

  // Keep XP rewards predictable and not too noisy: 1 XP every 2 minutes spent.
  const xpGained = Math.floor(minutes / TIME_SPENT_XP_DIVISOR);
  if (xpGained > 0) {
    state.xp += xpGained;
    state.actionLog = [
      { action: "time_spent", xp: xpGained, label: "Spent time with Quran", timestamp: Date.now() },
      ...(state.actionLog ?? []),
    ].slice(0, GAMIFICATION_ACTION_LOG_LIMIT);
  }

  const newDeeds = checkDeeds(state);
  return { xpGained, newDeeds };
}

/**
 * Check which badges should now be awarded based on state.
 * Returns array of newly earned badge objects.
 */
function checkBadges(state) {
  const earned = new Set(state.badges ?? []);
  const newBadges = [];

  function earn(id) {
    if (earned.has(id)) return;
    earned.add(id);
    state.badges.push(id);
    state.badgeLog = state.badgeLog ?? [];
    state.badgeLog.push({ id, earnedAt: Date.now() });
    // Badge XP bonus
    const badge = BADGES[id];
    if (badge?.xp) state.xp += badge.xp;
    newBadges.push(badge);
  }

  // Action-based badges (check actionsToday totals across all time via actionLog)
  const totalActions = {};
  for (const entry of state.actionLog ?? []) {
    totalActions[entry.action] = (totalActions[entry.action] ?? 0) + 1;
  }

  if ((totalActions.bookmark_verse ?? 0) >= 1) earn("first_bookmark");
  if ((totalActions.save_note ?? 0) >= 1) earn("first_note");
  if ((totalActions.chat_message ?? 0) >= 1) earn("first_chat");
  if ((totalActions.discover_search ?? 0) >= 1) earn("first_discover");
  if ((totalActions.discover_search ?? 0) >= 5) earn("discover_5");
  if ((state.reflections_count ?? 0) >= 5) earn("reflective_5");
  if ((state.notes_count ?? 0) >= 10) earn("notes_10");
  if ((state.surahs_read ?? []).length >= 10) earn("read_10_surahs");

  // Level badges
  const level = getLevelInfo(state.xp).current.level;
  if (level >= 4) earn("level_scholar");
  if (level >= 5) earn("level_hafiz");
  if (level >= 6) earn("level_imam");

  // Time-based badges
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 2) earn("night_owl");
  if (hour >= 4 && hour < 6) earn("early_bird");

  return newBadges;
}

function checkDeeds(state) {
  const earned = new Set(state.deeds ?? []);
  const newDeeds = [];

  function earn(id) {
    if (earned.has(id)) return;
    const deed = DEEDS[id];
    if (!deed) return;
    earned.add(id);
    state.deeds.push(id);
    state.deedLog = state.deedLog ?? [];
    state.deedLog.push({ id, earnedAt: Date.now() });
    if (deed.xp) state.xp += deed.xp;
    newDeeds.push(deed);
  }

  const total = state.total_minutes_spent ?? 0;
  if (total >= DEED_THRESHOLDS_MINUTES.minutes_15) earn("minutes_15");
  if (total >= DEED_THRESHOLDS_MINUTES.minutes_60) earn("minutes_60");
  if (total >= DEED_THRESHOLDS_MINUTES.minutes_180) earn("minutes_180");

  return newDeeds;
}

/** Award daily login XP — called once per day max */
export function awardDailyLogin(state) {
  if (state.todayKey === todayString() && (state.actionsToday?.daily_login ?? 0) > 0) {
    return { xpGained: 0, newBadges: [], leveledUp: false };
  }
  return awardXP(state, "daily_login");
}

/** Mark a badge earned from external source (e.g. streak badge from API data) */
export function awardStreakBadge(state, streakDays) {
  const results = [];
  if (streakDays >= 3) {
    const r = awardXP(state, "streak_3");
    if (!state.badges.includes("streak_3")) results.push(...r.newBadges);
  }
  if (streakDays >= 7) {
    const r = awardXP(state, "streak_7");
    if (!state.badges.includes("streak_7")) results.push(...r.newBadges);
  }
  if (streakDays >= 30) {
    const r = awardXP(state, "streak_30");
    if (!state.badges.includes("streak_30")) results.push(...r.newBadges);
  }
  return results;
}
