import { describe, expect, it } from "vitest";

import { buildRevisionQueue, countDueCards, isCardDue, mergeKeysIntoDeck } from "@/lib/hifz-queue";

describe("hifz-queue", () => {
  const today = "2026-05-17";

  it("isCardDue when dueDayKey is today or earlier", () => {
    expect(isCardDue({ scheduling: { dueDayKey: "2026-05-16" } }, today)).toBe(true);
    expect(isCardDue({ scheduling: { dueDayKey: "2026-05-18" } }, today)).toBe(false);
    expect(isCardDue({}, today)).toBe(true);
  });

  it("buildRevisionQueue sorts by dueDayKey then reps", () => {
    const cards = {
      "1:3": { scheduling: { dueDayKey: "2026-05-17", reps: 2 } },
      "1:1": { scheduling: { dueDayKey: "2026-05-15", reps: 5 } },
      "1:2": { scheduling: { dueDayKey: "2026-05-17", reps: 0 } },
      "2:1": { scheduling: { dueDayKey: "2026-05-20", reps: 0 } },
    };
    const q = buildRevisionQueue(cards, today);
    expect(q).toEqual(["1:1", "1:2", "1:3"]);
  });

  it("mergeKeysIntoDeck adds only new keys", () => {
    const { next, added } = mergeKeysIntoDeck({ "1:1": { scheduling: { dueDayKey: today } } }, ["1:1", "1:2"], today);
    expect(added).toBe(1);
    expect(Object.keys(next).sort()).toEqual(["1:1", "1:2"]);
    expect(next["1:2"].scheduling.dueDayKey).toBe(today);
  });

  it("countDueCards", () => {
    const cards = {
      a: { scheduling: { dueDayKey: "2026-05-10" } },
      b: { scheduling: { dueDayKey: "2026-05-20" } },
    };
    expect(countDueCards(cards, today)).toBe(1);
  });
});
