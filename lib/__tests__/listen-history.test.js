import { describe, expect, it } from "vitest";

import {
  MAX_LISTEN_ENTRIES_PER_RECITER,
  capListenEntriesPerReciter,
  getEntriesForReciter,
  listenEntryKey,
  normalizeListenHistoryPayload,
  resumeStartSec,
  upsertListenEntry,
} from "../listen-history.js";

describe("listenEntryKey", () => {
  it("combines reciter and surah", () => {
    expect(listenEntryKey(7, 2)).toBe("7:2");
  });
});

describe("resumeStartSec", () => {
  it("returns 0 when position too small", () => {
    expect(resumeStartSec({ positionSec: 1, durationSec: 100 })).toBe(0);
  });

  it("returns 0 when near end", () => {
    expect(resumeStartSec({ positionSec: 95, durationSec: 100 })).toBe(0);
  });

  it("returns position when in middle", () => {
    expect(resumeStartSec({ positionSec: 42, durationSec: 100 })).toBe(42);
  });
});

describe("upsertListenEntry", () => {
  const base = (surahId, reciterId = 7, updatedAt = 0) => ({
    reciterId,
    reciterName: "R",
    surahId,
    surahName: `S${surahId}`,
    positionSec: 10,
    durationSec: 100,
    updatedAt,
  });

  it("moves duplicate surah to top", () => {
    const entries = [base(1, 7, 1), base(2, 7, 2)];
    const next = upsertListenEntry(entries, { ...base(1, 7, 99), positionSec: 50 });
    expect(next[0].surahId).toBe(1);
    expect(next[0].positionSec).toBe(50);
    expect(next[0].updatedAt).toBe(99);
  });

  it("caps at 5 per reciter", () => {
    let entries = [];
    for (let i = 1; i <= 7; i++) {
      entries = upsertListenEntry(entries, base(i, 7, i * 1000));
    }
    const for7 = getEntriesForReciter(entries, 7);
    expect(for7).toHaveLength(MAX_LISTEN_ENTRIES_PER_RECITER);
    expect(for7.map((e) => e.surahId)).toEqual([7, 6, 5, 4, 3]);
  });

  it("keeps separate lists per reciter", () => {
    let entries = upsertListenEntry([], base(1, 7, 1));
    entries = upsertListenEntry(entries, base(2, 3, 2));
    expect(getEntriesForReciter(entries, 7)).toHaveLength(1);
    expect(getEntriesForReciter(entries, 3)).toHaveLength(1);
  });
});

describe("normalizeListenHistoryPayload", () => {
  it("drops invalid rows and dedupes", () => {
    const out = normalizeListenHistoryPayload({
      entries: [
        { reciterId: 7, surahId: 1, positionSec: 1, updatedAt: 1 },
        { reciterId: 7, surahId: 1, positionSec: 9, updatedAt: 2 },
        { foo: "bar" },
      ],
    });
    expect(out.entries).toHaveLength(1);
    expect(out.entries[0].positionSec).toBe(9);
    expect(out.entries[0].updatedAt).toBe(2);
  });
});

describe("capListenEntriesPerReciter", () => {
  it("sorts globally by updatedAt after cap", () => {
    const entries = [
      { reciterId: 1, surahId: 1, updatedAt: 100 },
      { reciterId: 2, surahId: 1, updatedAt: 200 },
    ].map((e) => ({
      ...e,
      reciterName: "R",
      surahName: "S",
      positionSec: 0,
      durationSec: 0,
    }));
    const capped = capListenEntriesPerReciter(entries);
    expect(capped[0].reciterId).toBe(2);
  });
});
