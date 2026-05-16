import { describe, expect, it } from "vitest";

import {
  buildPrayerSlots,
  formatPrayerTime12h,
  parsePrayerTimeToday,
  pickNextPrayer,
} from "../prayer-times";

describe("parsePrayerTimeToday", () => {
  it("parses plain HH:MM", () => {
    const d = parsePrayerTimeToday("18:30");
    expect(d).not.toBeNull();
    expect(d.getHours()).toBe(18);
    expect(d.getMinutes()).toBe(30);
  });

  it("parses HH:MM with timezone suffix", () => {
    const d = parsePrayerTimeToday("05:12 (PKT)");
    expect(d).not.toBeNull();
    expect(d.getHours()).toBe(5);
    expect(d.getMinutes()).toBe(12);
  });

  it("returns null for invalid input", () => {
    expect(parsePrayerTimeToday("invalid")).toBeNull();
  });
});

describe("buildPrayerSlots", () => {
  it("builds sorted slots from timings", () => {
    const slots = buildPrayerSlots({
      Maghrib: "18:30",
      Fajr: "05:00",
      Dhuhr: "12:15",
    });
    expect(slots.map((s) => s.name)).toEqual(["Fajr", "Dhuhr", "Maghrib"]);
  });
});

describe("pickNextPrayer", () => {
  const slots = buildPrayerSlots({
    Fajr: "05:00",
    Dhuhr: "12:00",
    Asr: "15:30",
    Maghrib: "18:30",
    Isha: "20:00",
  });

  it("returns next future slot", () => {
    const noon = new Date();
    noon.setHours(13, 0, 0, 0);
    const next = pickNextPrayer(slots, noon.getTime());
    expect(next?.name).toBe("Asr");
  });

  it("wraps to first slot when all passed today", () => {
    const late = new Date();
    late.setHours(23, 0, 0, 0);
    const next = pickNextPrayer(slots, late.getTime());
    expect(next?.name).toBe("Fajr");
  });
});

describe("formatPrayerTime12h", () => {
  it("formats as lowercase 12h clock", () => {
    const d = new Date();
    d.setHours(18, 30, 0, 0);
    expect(formatPrayerTime12h(d)).toMatch(/6:30\s*pm/);
  });
});
