import { beforeEach, describe, expect, it, vi } from "vitest";

// mockCreate must be hoisted so it's available inside the hoisted vi.mock factory
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    constructor() {
      this.messages = { create: mockCreate };
    }
  },
}));

import { AIService } from "../claude.js";

function getMockCreate() {
  return mockCreate;
}

function makeResponse(text) {
  return {
    content: [{ type: "text", text }],
  };
}

// ─── AIService.discoverVerses ──────────────────────────────────────────────────

describe("AIService.discoverVerses", () => {
  let service;

  beforeEach(() => {
    getMockCreate().mockReset();
    service = new AIService();
  });

  it("returns parsed verses on valid JSON response", async () => {
    const json = JSON.stringify({
      verses: [
        { verse_key: "2:155", relevance_explanation: "About patience", theme: "Patience" },
        { verse_key: "93:5", relevance_explanation: "About relief", theme: "Hope" },
        { verse_key: "65:3", relevance_explanation: "About trust", theme: "Tawakkul" },
      ],
    });
    getMockCreate().mockResolvedValue(makeResponse(json));

    const result = await service.discoverVerses("I am feeling anxious");

    expect(result.success).toBe(true);
    expect(result.verses).toHaveLength(3);
    expect(result.verses[0].verse_key).toBe("2:155");
    expect(result.verses[0].theme).toBe("Patience");
  });

  it("returns parsed verses when JSON is wrapped in markdown code fences", async () => {
    const json = JSON.stringify({
      verses: [{ verse_key: "3:173", relevance_explanation: "Trust in Allah", theme: "Trust" }],
    });
    getMockCreate().mockResolvedValue(makeResponse("```json\n" + json + "\n```"));

    const result = await service.discoverVerses("I need courage");

    expect(result.success).toBe(true);
    expect(result.verses[0].verse_key).toBe("3:173");
  });

  it("returns success:false and empty verses on invalid JSON", async () => {
    getMockCreate().mockResolvedValue(makeResponse("this is not json at all"));

    const result = await service.discoverVerses("anything");

    expect(result.success).toBe(false);
    expect(result.verses).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it("passes situation to user message and search results as context", async () => {
    getMockCreate().mockResolvedValue(makeResponse(JSON.stringify({ verses: [] })));

    const searchResults = [{ verse_key: "2:286", text: "Allah does not burden a soul beyond that it can bear" }];
    await service.discoverVerses("overwhelmed with work", searchResults);

    const [callArgs] = getMockCreate().mock.calls;
    expect(callArgs[0].messages[0].content).toContain("overwhelmed with work");
    expect(callArgs[0].system).toContain("2:286");
  });

  it("handles empty search results gracefully", async () => {
    getMockCreate().mockResolvedValue(makeResponse(JSON.stringify({ verses: [] })));

    const result = await service.discoverVerses("I feel lost", []);

    expect(result.success).toBe(true);
    expect(result.verses).toEqual([]);
  });

  it("limits candidates to first 15 search results", async () => {
    getMockCreate().mockResolvedValue(makeResponse(JSON.stringify({ verses: [] })));

    const results = Array.from({ length: 20 }, (_, i) => ({
      verse_key: `2:${i + 1}`,
      text: `verse ${i + 1}`,
    }));
    await service.discoverVerses("test", results);

    const [callArgs] = getMockCreate().mock.calls;
    // Only first 15 should appear in system prompt
    expect(callArgs[0].system).toContain("2:15");
    expect(callArgs[0].system).not.toContain("2:16");
  });

  it("strips HTML tags from search result text", async () => {
    getMockCreate().mockResolvedValue(makeResponse(JSON.stringify({ verses: [] })));

    await service.discoverVerses("test", [{ verse_key: "2:1", text: "<em>Allah</em> is One" }]);

    const [callArgs] = getMockCreate().mock.calls;
    expect(callArgs[0].system).toContain("Allah is One");
    expect(callArgs[0].system).not.toContain("<em>");
  });
});

// ─── AIService.generateReflectionPrompts ─────────────────────────────────────

describe("AIService.generateReflectionPrompts", () => {
  let service;

  beforeEach(() => {
    getMockCreate().mockReset();
    service = new AIService();
  });

  it("returns parsed array of questions on valid JSON", async () => {
    const questions = ["How does this verse apply today?", "What action can you take?", "How would life change?"];
    getMockCreate().mockResolvedValue(makeResponse(JSON.stringify(questions)));

    const result = await service.generateReflectionPrompts("2:255", "Arabic text", "Translation");

    expect(result).toHaveLength(3);
    expect(result[0]).toBe("How does this verse apply today?");
  });

  it("returns questions from markdown-fenced JSON", async () => {
    const questions = ["Q1", "Q2", "Q3"];
    getMockCreate().mockResolvedValue(makeResponse("```json\n" + JSON.stringify(questions) + "\n```"));

    const result = await service.generateReflectionPrompts("2:255", "Arabic", "Translation");

    expect(result).toEqual(questions);
  });

  it("returns 3 fallback questions on invalid JSON", async () => {
    getMockCreate().mockResolvedValue(makeResponse("not valid json"));

    const result = await service.generateReflectionPrompts("2:255", "Arabic", "Translation");

    expect(result).toHaveLength(3);
    expect(typeof result[0]).toBe("string");
    expect(result[0].length).toBeGreaterThan(0);
  });

  it("passes verseKey and translation in user message", async () => {
    getMockCreate().mockResolvedValue(makeResponse(JSON.stringify(["Q1", "Q2", "Q3"])));

    await service.generateReflectionPrompts("3:173", "Arabic text", "Allah is sufficient for us");

    const [callArgs] = getMockCreate().mock.calls;
    expect(callArgs[0].messages[0].content).toContain("3:173");
    expect(callArgs[0].messages[0].content).toContain("Allah is sufficient for us");
  });

  it("includes tafsir snippet in user message when provided", async () => {
    getMockCreate().mockResolvedValue(makeResponse(JSON.stringify(["Q1", "Q2", "Q3"])));

    await service.generateReflectionPrompts("2:255", "Arabic", "Translation", "Ibn Kathir commentary here");

    const [callArgs] = getMockCreate().mock.calls;
    expect(callArgs[0].messages[0].content).toContain("Ibn Kathir commentary here");
  });

  it("uses claude-sonnet-4-6 model", async () => {
    getMockCreate().mockResolvedValue(makeResponse(JSON.stringify(["Q1", "Q2", "Q3"])));

    await service.generateReflectionPrompts("2:255", "Arabic", "Translation");

    const [callArgs] = getMockCreate().mock.calls;
    expect(callArgs[0].model).toBe("claude-sonnet-4-6");
  });
});
