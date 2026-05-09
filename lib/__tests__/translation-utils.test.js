import { describe, expect, it } from "vitest";

import { cleanTranslationText } from "@/lib/translation-utils";

describe("cleanTranslationText", () => {
  it("removes inline numeric footnote markers", () => {
    const raw =
      "through whom1 you ask one another,2 and the wombs.3 Indeed Allah is ever,4 over you, an Observer.5";
    expect(cleanTranslationText(raw)).toBe(
      "through whom you ask one another, and the wombs. Indeed Allah is ever, over you, an Observer.",
    );
  });

  it("keeps normal numbers untouched where not footnote-like", () => {
    expect(cleanTranslationText("Read 2 pages in 10 minutes.")).toBe("Read 2 pages in 10 minutes.");
  });
});
