/**
 * @fileoverview Goals Page — Post-Ramadan Reading Goal Builder
 *
 * Helps users set and track meaningful Quran engagement goals
 * beyond Ramadan — directly addresses the hackathon's core theme.
 *
 * Features:
 *  - Preset goal templates (complete Quran, daily reading, memorization)
 *  - Custom goal creation with a target date
 *  - Visual progress display (circular progress + days remaining)
 *  - Active goals list with completion tracking
 *
 * Uses the Quran Foundation Goals API + Activity API.
 * For the demo, goals are stored locally in state; with a user token
 * they persist to the Quran Foundation User API.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CheckCircle2, Clock, Loader2, Plus, Target, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { aggregateGoalSignals, computeDerivedProgress, normalizeApiGoal } from "@/lib/goal-progress";
import { QALB_TIME_TRACKING_UPDATED_EVENT } from "@/lib/qalb-storage-keys";
import { useGamification } from "@/lib/useGamification";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Constants — Goal Templates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-defined goal templates. Each has a type, a display label,
 * a description, a recommended daily commitment, and an icon emoji.
 * These map to the Quran Foundation Goals API goal types.
 *
 * @type {Array<GoalTemplate>}
 */
const GOAL_TEMPLATES = [
  {
    id: "complete_quran",
    label: "Complete the Quran",
    description: "Read all 30 Juz of the Quran",
    dailyMinutes: 20,
    icon: "📖",
    color: "border-amber-400/30 bg-amber-400/5",
    accent: "text-amber-400",
  },
  {
    id: "daily_verse",
    label: "Daily Verse Habit",
    description: "Read at least one verse every day",
    dailyMinutes: 5,
    icon: "🌟",
    color: "border-blue-400/30 bg-blue-400/5",
    accent: "text-blue-400",
  },
  {
    id: "memorize_surahs",
    label: "Memorize Short Surahs",
    description: "Memorize the last 10 surahs of the Quran",
    dailyMinutes: 15,
    icon: "🧠",
    color: "border-purple-400/30 bg-purple-400/5",
    accent: "text-purple-400",
  },
  {
    id: "study_tafsir",
    label: "Study Tafsir",
    description: "Study the meaning of one surah per week",
    dailyMinutes: 30,
    icon: "📚",
    color: "border-green-400/30 bg-green-400/5",
    accent: "text-green-400",
  },
  {
    id: "custom",
    label: "Custom Goal",
    description: "Set your own personal goal",
    dailyMinutes: 10,
    icon: "✨",
    color: "border-border/50 bg-card",
    accent: "text-accent",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the number of days remaining until a target date.
 * @param {string} targetDate - ISO date string
 * @returns {number} Days remaining (0 if past)
 */
function daysUntil(targetDate) {
  const diff = new Date(targetDate) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Returns a default target date 90 days from today (post-Ramadan 3 months).
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
function defaultTargetDate() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Displays a single active goal with its progress and actions.
 * @param {object} props
 * @param {object} props.goal
 * @param {Function} props.onDelete
 * @param {Function} props.onProgress - called when user marks progress
 */
function GoalCard({ goal, onDelete, onProgress }) {
  const daysLeft = daysUntil(goal.targetDate);
  const template = GOAL_TEMPLATES.find((t) => t.id === goal.type) ?? GOAL_TEMPLATES[4];
  const blended = Math.min(goal.total, Math.max(Number(goal.progress) || 0, Number(goal.derivedProgress) || 0));
  const progressPct = Math.min(100, Math.round((blended / goal.total) * 100));
  const isComplete = progressPct >= 100;

  return (
    <article className={cn("rounded-2xl border p-4 transition-all", template.color, isComplete && "opacity-75")}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2.5">
          <span className="text-xl" role="img" aria-label={template.label}>
            {template.icon}
          </span>
          <div>
            <p className="font-semibold text-sm text-foreground">{goal.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isComplete && (
            <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-400/30">Done!</Badge>
          )}
          <button
            onClick={() => onDelete(goal.id)}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
            aria-label="Delete goal"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={progressPct} className="h-1.5 mb-2" />

      {/* Stats row */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{progressPct}% complete</span>
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {daysLeft > 0 ? `${daysLeft} days left` : "Deadline passed"}
        </span>
      </div>

      {/* Mark progress button */}
      {!isComplete && (
        <button
          onClick={() => onProgress(goal.id)}
          className={cn(
            "mt-3 w-full text-xs py-1.5 rounded-lg border transition-colors",
            "border-border/50 text-muted-foreground hover:text-foreground hover:bg-white/5",
          )}
        >
          <CheckCircle2 size={12} className="inline mr-1.5" />
          Mark today&apos;s session done
        </button>
      )}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Goals page — set and track post-Ramadan Quran reading goals.
 */
export default function GoalsPage() {
  const { status } = useSession();
  const { award } = useGamification();

  /** List of active user goals */
  const [goals, setGoals] = useState([]);
  const [activityEvents, setActivityEvents] = useState([]);
  const [hydrating, setHydrating] = useState(false);
  const completedAwardedRef = useRef(new Set());

  /** Controls which template is selected in the creator */
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  /** Target date for the new goal */
  const [targetDate, setTargetDate] = useState(defaultTargetDate());

  /** Custom goal description (used when template is "custom") */
  const [customDescription, setCustomDescription] = useState("");

  /** Whether the "Add Goal" form is open */
  const [isAdding, setIsAdding] = useState(false);

  const applyDerivedProgress = useCallback((goalList, events) => {
    const agg = aggregateGoalSignals(events);
    return goalList.map((g) => ({
      ...g,
      derivedProgress: computeDerivedProgress(g, agg),
    }));
  }, []);

  const hydrate = useCallback(async () => {
    if (status !== "authenticated") {
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem("qalb_goals_local") : null;
        const parsed = raw ? JSON.parse(raw) : [];
        setGoals(Array.isArray(parsed) ? applyDerivedProgress(parsed, []) : []);
      } catch {
        setGoals([]);
      }
      setActivityEvents([]);
      return;
    }
    setHydrating(true);
    try {
      const [gr, ar] = await Promise.all([fetch("/api/user/goals"), fetch("/api/user/activity?days=400")]);
      let nextGoals = [];
      if (gr.ok) {
        const gj = await gr.json().catch(() => ({}));
        const list = Array.isArray(gj?.goals) ? gj.goals : [];
        nextGoals = list.map((row) => normalizeApiGoal(row, GOAL_TEMPLATES)).filter(Boolean);
      }
      let events = [];
      if (ar.ok) {
        const aj = await ar.json().catch(() => ({}));
        events = aj?.events && Array.isArray(aj.events) ? aj.events : [];
      }
      setActivityEvents(events);
      let resolved =
        nextGoals.length > 0
          ? applyDerivedProgress(nextGoals, events)
          : (() => {
              try {
                const raw = localStorage.getItem("qalb_goals_local");
                const parsed = raw ? JSON.parse(raw) : [];
                return Array.isArray(parsed) ? applyDerivedProgress(parsed, events) : [];
              } catch {
                return [];
              }
            })();
      setGoals((prev) =>
        resolved.length > 0 ? resolved : prev.length > 0 ? applyDerivedProgress(prev, events) : [],
      );
    } catch {
      toast.error("Could not refresh goals.");
    } finally {
      setHydrating(false);
    }
  }, [applyDerivedProgress, status]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onTk() {
      void hydrate();
    }
    window.addEventListener(QALB_TIME_TRACKING_UPDATED_EVENT, onTk);
    return () => window.removeEventListener(QALB_TIME_TRACKING_UPDATED_EVENT, onTk);
  }, [hydrate]);

  useEffect(() => {
    if (!goals.length) return;
    for (const g of goals) {
      const blended = Math.min(g.total, Math.max(Number(g.progress) || 0, Number(g.derivedProgress) || 0));
      if (blended >= g.total && !completedAwardedRef.current.has(g.id)) {
        completedAwardedRef.current.add(g.id);
        award("complete_goal");
        toast.success("Goal completed — you earned XP for finishing strong.");
      }
    }
  }, [goals, award]);

  const persistLocalFallback = useCallback((list) => {
    try {
      localStorage.setItem("qalb_goals_local", JSON.stringify(list));
    } catch {
      /* ignore */
    }
  }, []);

  /**
   * Saves a new goal from the selected template — POST /api/user/goals when signed in.
   */
  const handleAddGoal = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a goal type.");
      return;
    }
    if (!targetDate) {
      toast.error("Please set a target date.");
      return;
    }

    const templateId = selectedTemplate;
    const template = GOAL_TEMPLATES.find((t) => t.id === templateId);

    const total = templateId === "complete_quran" ? 30 : daysUntil(targetDate);
    const newGoal = {
      id: Date.now().toString(),
      type: templateId,
      label: template.label,
      description: templateId === "custom" ? customDescription || template.description : template.description,
      targetDate,
      dailyMinutes: template.dailyMinutes,
      progress: 0,
      total,
      createdAt: new Date().toISOString(),
    };

    setSelectedTemplate(null);
    setCustomDescription("");
    setIsAdding(false);

    if (status === "authenticated") {
      try {
        const body = {
          type: templateId,
          targetDate,
          dailyMinutes: template.dailyMinutes,
          target: template.label,
          total,
          metadata: {
            templateId,
            label: template.label,
            description: newGoal.description,
            total,
          },
        };
        const res = await fetch("/api/user/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(String(res.status));
        const gj = await res.json().catch(() => ({}));
        const normalized = gj?.goal ? normalizeApiGoal(gj.goal, GOAL_TEMPLATES) : normalizeApiGoal(gj, GOAL_TEMPLATES);
        setGoals((prev) => {
          const u = normalized
            ? applyDerivedProgress([normalized, ...prev.filter((p) => p.id !== normalized.id)], activityEvents)
            : applyDerivedProgress([newGoal, ...prev], activityEvents);
          persistLocalFallback(u);
          return u;
        });
        toast.success("Goal synced to your account.");
      } catch {
        setGoals((prev) => {
          const u = applyDerivedProgress([newGoal, ...prev], activityEvents);
          persistLocalFallback(u);
          return u;
        });
        toast.success("Goal saved locally (remote sync unavailable).");
      }
    } else {
      setGoals((prev) => {
        const u = applyDerivedProgress([newGoal, ...prev], []);
        persistLocalFallback(u);
        return u;
      });
      toast.success("Goal created locally — sign in to sync.");
    }
  };

  /** Manual nudge (+1 progress). */
  const handleProgress = (goalId) => {
    setGoals((prev) => {
      const bumped = prev.map((g) =>
        g.id === goalId ? { ...g, progress: Math.min((Number(g.progress) || 0) + 1, g.total) } : g,
      );
      persistLocalFallback(bumped);
      return applyDerivedProgress(bumped, activityEvents);
    });
    toast.success("Progress saved!");
  };

  /** Removes goal — DELETE /api/user/goals body when signed in. */
  const handleDelete = async (goalId) => {
    setGoals((prev) => {
      const u = prev.filter((g) => g.id !== goalId);
      persistLocalFallback(u);
      completedAwardedRef.current.delete(goalId);
      return u;
    });
    toast("Goal removed.");
    if (status === "authenticated") {
      try {
        await fetch("/api/user/goals", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goalId }),
        });
      } catch {
        /* ignore */
      }
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-6">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Target size={20} className="text-accent" />
            My Goals
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Build lasting habits beyond Ramadan
            {hydrating ? (
              <Loader2 size={12} className="inline ml-2 animate-spin text-accent align-middle opacity-70" />
            ) : null}
          </p>
          {status === "unauthenticated" ? (
            <p className="text-[11px] text-amber-500/90 mt-1">
              Sign in to sync goals with your Quran Foundation account.
            </p>
          ) : null}
        </div>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)} className="h-8 text-xs bg-primary hover:bg-primary/80">
          <Plus size={13} className="mr-1" />
          Add Goal
        </Button>
      </div>

      {/* ── Goal Creator ────────────────────────────────────────────────── */}
      {isAdding && (
        <section
          className="mb-6 p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-4 animate-fade-in-up"
          aria-label="Create new goal"
        >
          <h2 className="text-sm font-semibold text-foreground">Choose a goal type</h2>

          {/* Template grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {GOAL_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={cn(
                  "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                  template.color,
                  selectedTemplate === template.id ? "ring-2 ring-primary scale-[1.02]" : "hover:scale-[1.01]",
                )}
              >
                <span className="text-xl shrink-0">{template.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{template.label}</p>
                  <p className="text-[10px] text-muted-foreground">{template.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Custom description field */}
          {selectedTemplate === "custom" && (
            <Input
              placeholder="Describe your custom goal..."
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              className="text-sm bg-card border-border/60"
            />
          )}

          {/* Target date */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground shrink-0" htmlFor="target-date">
              Target date:
            </label>
            <Input
              id="target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="text-sm bg-card border-border/60 flex-1"
            />
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary/80"
              onClick={handleAddGoal}
              disabled={!selectedTemplate}
            >
              Save Goal
            </Button>
          </div>
        </section>
      )}

      {/* ── Active Goals ────────────────────────────────────────────────── */}
      {goals.length > 0 ? (
        <div className="space-y-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} onProgress={handleProgress} />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🌙</p>
          <p className="font-semibold text-foreground mb-1">No goals yet</p>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
            Ramadan may be over, but your journey with the Quran doesn&apos;t have to end. Set a goal to stay on track.
          </p>
          <Button size="sm" className="text-xs bg-primary hover:bg-primary/80" onClick={() => setIsAdding(true)}>
            <Plus size={12} className="mr-1" />
            Create your first goal
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * @typedef {object} GoalTemplate
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {number} dailyMinutes
 * @property {string} icon
 * @property {string} color
 * @property {string} accent
 */
