import { describe, expect, it } from "vitest";

import { mergeHadithVisit } from "../last-hadith-reads.js";

describe("last-hadith-reads", () => {
  it("mergeHadithVisit prepends and drops duplicate href", () => {
    const base = [
      { href: "/ahadith/bukhari/2", label: "Old", sub: "Bukhari", timestamp: 1 },
      { href: "/ahadith/muslim/1", label: "Muslim", sub: "Muslim", timestamp: 2 },
    ];
    const merged = mergeHadithVisit(base, {
      href: "/ahadith/bukhari/2",
      label: "New chapter",
      sub: "Bukhari",
    });
    expect(merged[0].href).toBe("/ahadith/bukhari/2");
    expect(merged[0].label).toBe("New chapter");
    expect(merged.findIndex((r) => r.href === "/ahadith/bukhari/2")).toBe(0);
  });
});
