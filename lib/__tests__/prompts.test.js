import { describe, expect, it } from "vitest";

import {
  BASE_SYSTEM_PROMPT,
  buildDiscoverSystemPrompt,
  buildDiscoverUserMessage,
  buildReadSummaryPrompt,
  buildReflectionSystemPrompt,
  buildReflectionUserMessage,
  buildVersechatSystemPrompt,
} from "../prompts.js";

describe("BASE_SYSTEM_PROMPT", () => {
  it("contains the Qalb persona", () => {
    expect(BASE_SYSTEM_PROMPT).toContain("Qalb");
    expect(BASE_SYSTEM_PROMPT).toContain("Quran");
  });

  it("includes rules block", () => {
    expect(BASE_SYSTEM_PROMPT).toContain("<RULES>");
    expect(BASE_SYSTEM_PROMPT).toContain("Never fabricate");
  });
});

describe("buildDiscoverSystemPrompt", () => {
  it("includes BASE_SYSTEM_PROMPT content", () => {
    const prompt = buildDiscoverSystemPrompt();
    expect(prompt).toContain("Qalb");
    expect(prompt).toContain("Never fabricate");
  });

  it("includes the TASK block", () => {
    const prompt = buildDiscoverSystemPrompt();
    expect(prompt).toContain("<TASK>");
    expect(prompt).toContain("exactly 3");
  });

  it("includes candidates section when provided", () => {
    const candidates = "CANDIDATES_BLOCK";
    const prompt = buildDiscoverSystemPrompt(candidates);
    expect(prompt).toContain("CANDIDATES_BLOCK");
  });

  it("works with empty string (no candidates)", () => {
    const prompt = buildDiscoverSystemPrompt("");
    expect(prompt).toContain("<TASK>");
  });

  it("specifies JSON output format", () => {
    const prompt = buildDiscoverSystemPrompt();
    expect(prompt).toContain("verse_key");
    expect(prompt).toContain("relevance_explanation");
    expect(prompt).toContain("theme");
  });
});

describe("buildDiscoverUserMessage", () => {
  it("wraps the situation in quotes", () => {
    const msg = buildDiscoverUserMessage("I am anxious about the future");
    expect(msg).toContain('"I am anxious about the future"');
  });

  it("asks to select 3 relevant verses", () => {
    const msg = buildDiscoverUserMessage("anything");
    expect(msg).toContain("3 relevant verses");
  });

  it("includes different situations verbatim", () => {
    const situation = "feeling grateful after Ramadan";
    const msg = buildDiscoverUserMessage(situation);
    expect(msg).toContain(situation);
  });
});

describe("buildReflectionSystemPrompt", () => {
  it("includes BASE_SYSTEM_PROMPT content", () => {
    const prompt = buildReflectionSystemPrompt();
    expect(prompt).toContain("Qalb");
  });

  it("asks for exactly 3 questions", () => {
    const prompt = buildReflectionSystemPrompt();
    expect(prompt).toContain("exactly 3");
  });

  it("specifies JSON array output", () => {
    const prompt = buildReflectionSystemPrompt();
    expect(prompt).toContain("JSON array");
  });

  it("asks for introspective questions", () => {
    const prompt = buildReflectionSystemPrompt();
    expect(prompt).toContain("introspective");
  });
});

describe("buildReflectionUserMessage", () => {
  it("includes verse key", () => {
    const msg = buildReflectionUserMessage("2:255", "Allah — there is no deity except Him");
    expect(msg).toContain("2:255");
  });

  it("includes translation text", () => {
    const translation = "Allah — there is no deity except Him";
    const msg = buildReflectionUserMessage("2:255", translation);
    expect(msg).toContain(translation);
  });

  it("omits tafsir section when not provided", () => {
    const msg = buildReflectionUserMessage("2:255", "some translation");
    expect(msg).not.toContain("Tafsir context:");
  });

  it("includes tafsir context when provided", () => {
    const msg = buildReflectionUserMessage("2:255", "some translation", "Ibn Kathir says...");
    expect(msg).toContain("Tafsir context: Ibn Kathir says...");
  });

  it("omits tafsir section for empty string", () => {
    const msg = buildReflectionUserMessage("2:255", "some translation", "");
    expect(msg).not.toContain("Tafsir context:");
  });
});

describe("buildVersechatSystemPrompt", () => {
  const baseCtx = {
    verseKey: "2:255",
    chapterName: "Al-Baqarah",
    arabicText: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ",
    translation: "Allah — there is no deity except Him",
  };

  it("includes verse key", () => {
    const prompt = buildVersechatSystemPrompt(baseCtx);
    expect(prompt).toContain("2:255");
  });

  it("includes chapter name", () => {
    const prompt = buildVersechatSystemPrompt(baseCtx);
    expect(prompt).toContain("Al-Baqarah");
  });

  it("includes Arabic text", () => {
    const prompt = buildVersechatSystemPrompt(baseCtx);
    expect(prompt).toContain(baseCtx.arabicText);
  });

  it("includes translation", () => {
    const prompt = buildVersechatSystemPrompt(baseCtx);
    expect(prompt).toContain(baseCtx.translation);
  });

  it("omits tafsir section when not provided", () => {
    const prompt = buildVersechatSystemPrompt(baseCtx);
    expect(prompt).not.toContain("Tafsir");
  });

  it("includes tafsir excerpt when provided (truncated to 800 chars)", () => {
    const longTafsir = "A".repeat(1000);
    const prompt = buildVersechatSystemPrompt({ ...baseCtx, tafsirText: longTafsir });
    expect(prompt).toContain("Tafsir");
    // Should only include first 800 chars
    const tafsirInPrompt = "A".repeat(800);
    expect(prompt).toContain(tafsirInPrompt);
    expect(prompt).not.toContain("A".repeat(801));
  });

  it("includes tafsir when short enough", () => {
    const shortTafsir = "This verse is about the oneness of Allah.";
    const prompt = buildVersechatSystemPrompt({ ...baseCtx, tafsirText: shortTafsir });
    expect(prompt).toContain(shortTafsir);
  });

  it("includes BASE_SYSTEM_PROMPT rules", () => {
    const prompt = buildVersechatSystemPrompt(baseCtx);
    expect(prompt).toContain("Never fabricate");
  });
});

describe("buildReadSummaryPrompt", () => {
  const baseArgs = {
    surahName: "Al-Baqarah",
    pageNumber: 3,
    versesText: "Verse 1 text\nVerse 2 text",
    priorSummary: null,
  };

  it("includes surah name", () => {
    const prompt = buildReadSummaryPrompt(baseArgs);
    expect(prompt).toContain("Al-Baqarah");
  });

  it("includes page number", () => {
    const prompt = buildReadSummaryPrompt(baseArgs);
    expect(prompt).toContain("3");
  });

  it("includes verses text", () => {
    const prompt = buildReadSummaryPrompt(baseArgs);
    expect(prompt).toContain("Verse 1 text");
    expect(prompt).toContain("Verse 2 text");
  });

  it("omits Journey So Far section when no prior summary", () => {
    const prompt = buildReadSummaryPrompt(baseArgs);
    expect(prompt).not.toContain("Journey So Far");
  });

  it("includes Journey So Far when prior summary exists", () => {
    const prompt = buildReadSummaryPrompt({ ...baseArgs, priorSummary: "So far so good." });
    expect(prompt).toContain("Journey So Far");
    expect(prompt).toContain("So far so good.");
  });

  it("references prior page range in the prior section", () => {
    const prompt = buildReadSummaryPrompt({ ...baseArgs, priorSummary: "Summary here", pageNumber: 5 });
    expect(prompt).toContain("pages 1–4");
  });

  it("includes required output format headings", () => {
    const prompt = buildReadSummaryPrompt(baseArgs);
    expect(prompt).toContain("Key Themes");
    expect(prompt).toContain("Reflection");
  });
});
