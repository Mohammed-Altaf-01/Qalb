import { describe, expect, it } from "vitest";

import { buildDailyLetterPrompt } from "@/lib/prompts";

describe("buildDailyLetterPrompt", () => {
  it("embeds bounded context", () => {
    const p = buildDailyLetterPrompt({
      recentReflections: "Patience.",
      bookmarkedKeys: "2:255",
    });
    expect(p).toContain("Patience.");
    expect(p).toContain("2:255");
    expect(p).toContain("<FORMAT>");
  });
});
