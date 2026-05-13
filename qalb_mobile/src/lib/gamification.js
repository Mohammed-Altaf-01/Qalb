import {
  ACTION_LOG_LIMIT,
  DEED_THRESHOLDS_MINUTES,
  MS_PER_DAY,
  TIME_SPENT_XP_DIVISOR,
} from "../constants/gamification";

export const LEVELS = [
  { level: 1, icon: "🌱", title: "Seeker", minXp: 0 },
  { level: 2, icon: "📖", title: "Reader", minXp: 100 },
  { level: 3, icon: "🧠", title: "Student", minXp: 300 },
  { level: 4, icon: "🎓", title: "Scholar", minXp: 700 },
  { level: 5, icon: "📿", title: "Hafiz", minXp: 1500 },
  { level: 6, icon: "🕌", title: "Imam", minXp: 3000 },
];

export const XP_ACTIONS = {
  daily_login: { xp: 10, label: "Daily login" },
  read_verse_page: { xp: 5, label: "Read a page" },
  discover_search: { xp: 5, label: "Discovered verses" },
  generate_reflection: { xp: 10, label: "Generated reflections" },
  save_note: { xp: 15, label: "Saved reflection" },
  hadith_explore: { xp: 4, label: "Explored hadith" },
  play_audio: { xp: 3, label: "Played audio" },
};

export const DEEDS = {
  minutes_15: { id: "minutes_15", icon: "⏱️", title: "Steady Presence", xp: 15 },
  minutes_60: { id: "minutes_60", icon: "🕊️", title: "Heartful Hour", xp: 40 },
  minutes_180: { id: "minutes_180", icon: "🌙", title: "Consistent Devotion", xp: 90 },
};

export function getLevelInfo(xp = 0) {
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

export function defaultGamificationState() {
  return {
    xp: 0,
    badges: [],
    badgeLog: [],
    actionsToday: {},
    todayKey: null,
    actionLog: [],
    surahs_read: [],
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

export function normalizeGamificationState(state) {
  const base = defaultGamificationState();
  const s = typeof state === "object" && state !== null && !Array.isArray(state) ? { ...base, ...state } : { ...base };

  if (s.todayKey !== todayString()) {
    s.todayKey = todayString();
    s.actionsToday = {};
    s.challenge_completed = false;
  }
  s.actionLog = s.actionLog ?? [];
  s.badges = s.badges ?? [];
  s.badgeLog = s.badgeLog ?? [];
  s.deeds = s.deeds ?? [];
  s.deedLog = s.deedLog ?? [];
  s.surahs_read = s.surahs_read ?? [];
  s.total_minutes_spent = s.total_minutes_spent ?? 0;
  return s;
}

export function getDailyChallengeIndex() {
  return Math.floor(Date.now() / MS_PER_DAY);
}

export function awardXP(state, actionKey) {
  const action = XP_ACTIONS[actionKey];
  if (!action) return { xpGained: 0 };
  state.xp += action.xp;
  state.actionLog = [
    { action: actionKey, xp: action.xp, label: action.label, at: Date.now() },
    ...state.actionLog,
  ].slice(0, ACTION_LOG_LIMIT);
  state.actionsToday[actionKey] = (state.actionsToday[actionKey] ?? 0) + 1;
  if (actionKey === "discover_search") state.discovers_count += 1;
  if (actionKey === "generate_reflection") state.reflections_count += 1;
  if (actionKey === "save_note") state.notes_count += 1;
  return { xpGained: action.xp };
}

function checkDeeds(state) {
  const earned = new Set(state.deeds);
  const newDeeds = [];
  function earn(id) {
    if (earned.has(id)) return;
    const deed = DEEDS[id];
    if (!deed) return;
    state.deeds.push(id);
    state.deedLog.push({ id, at: Date.now() });
    state.xp += deed.xp;
    newDeeds.push(deed);
  }
  const total = state.total_minutes_spent;
  if (total >= DEED_THRESHOLDS_MINUTES.minutes_15) earn("minutes_15");
  if (total >= DEED_THRESHOLDS_MINUTES.minutes_60) earn("minutes_60");
  if (total >= DEED_THRESHOLDS_MINUTES.minutes_180) earn("minutes_180");
  return newDeeds;
}

export function awardTimeSpent(state, minutes = 1) {
  if (!minutes || minutes <= 0) return { xpGained: 0, newDeeds: [] };
  state.total_minutes_spent += minutes;
  const xpGained = Math.floor(minutes / TIME_SPENT_XP_DIVISOR);
  if (xpGained > 0) state.xp += xpGained;
  const newDeeds = checkDeeds(state);
  return { xpGained, newDeeds };
}
