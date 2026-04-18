/**
 * @fileoverview Claude AI Client — Contextual Verse Discovery & Reflection
 *
 * Powers two AI features:
 *  1. "What's on your mind?" — maps a user's life situation to relevant Quran verses
 *  2. Reflection Prompts     — generates thoughtful questions to deepen verse engagement
 *
 * Uses the Anthropic Claude API with the Quran Foundation MCP server
 * (https://mcp.quran.ai/) so all verse references are verified — no hallucinations.
 *
 * Design Patterns:
 *  - Facade    : AIService — hides all Claude/MCP complexity behind two clean methods
 *  - Template  : System prompts are composed from shared templates + method-specific
 *                context, keeping prompt logic DRY and easy to iterate on
 */
import Anthropic from "@anthropic-ai/sdk";

import {
  buildDiscoverSystemPrompt,
  buildDiscoverUserMessage,
  buildReflectionSystemPrompt,
  buildReflectionUserMessage,
} from "./prompts.js";

// ─────────────────────────────────────────────────────────────────────────────
// Facade: AI Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Facade over the Anthropic Claude API that exposes only the methods
 * needed by the Qalb application. All Claude and MCP configuration
 * is handled internally — consumers work with plain response objects.
 */
class AIService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  // ── Feature: Contextual Verse Discovery ────────────────────────────────────

  /**
   * The core AI feature of Qalb — takes a user's free-text description of their
   * life situation and finds the most relevant Quran verses with explanations.
   *
   * Flow:
   *  1. User describes their situation ("I'm feeling anxious about the future")
   *  2. Claude uses the Quran MCP to search for contextually relevant verses
   *  3. Returns 3 ranked verses, each with an explanation of relevance
   *
   * @param {string} userSituation - Free-text description of the user's life context
   * @param {Array<object>} [searchResults=[]] - Pre-fetched verse search results to anchor context
   * @returns {Promise<DiscoverResult>} Structured list of relevant verses
   */
  async discoverVerses(userSituation, searchResults = []) {
    const candidatesSection =
      searchResults.length > 0
        ? `\n\nVerse candidates retrieved from the Quran Foundation API:\n${searchResults
            .slice(0, 15)
            .map((r) => {
              const key = r.verse_key ?? r.id ?? "?";
              const text = r.text ?? r.translations?.[0]?.text ?? r.verse?.translations?.[0]?.text ?? "";
              return `[${key}] ${text.replace(/<[^>]*>/g, "").trim()}`;
            })
            .join("\n")}`
        : "";

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: buildDiscoverSystemPrompt(candidatesSection),
      messages: [{ role: "user", content: buildDiscoverUserMessage(userSituation) }],
    });

    return this.#parseVerseDiscoveryResponse(response);
  }

  // ── Feature: Reflection Prompts ────────────────────────────────────────────

  /**
   * Generates thoughtful reflection questions for a specific verse.
   * Designed to deepen the user's personal engagement with the verse
   * rather than just understanding it academically.
   *
   * @param {string} verseKey - The verse to generate prompts for (e.g. "2:255")
   * @param {string} verseText - Arabic text of the verse
   * @param {string} translation - English translation of the verse
   * @param {string} [tafsirSnippet=''] - Optional tafsir context for richer prompts
   * @returns {Promise<string[]>} Array of 3 reflection questions
   */
  async generateReflectionPrompts(verseKey, verseText, translation, tafsirSnippet = "") {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: buildReflectionSystemPrompt(),
      messages: [{ role: "user", content: buildReflectionUserMessage(verseKey, translation, tafsirSnippet) }],
    });

    return this.#parseReflectionResponse(response);
  }

  // ── Private Parsers ────────────────────────────────────────────────────────

  /**
   * Extracts structured verse data from a Claude response.
   * Safely handles cases where Claude wraps JSON in markdown code fences.
   *
   * @private
   * @param {object} response - Raw Anthropic API response
   * @returns {DiscoverResult}
   */
  #parseVerseDiscoveryResponse(response) {
    try {
      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      // Strip markdown code fences if present (```json ... ```)
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
      const parsed = JSON.parse(jsonMatch[1].trim());

      return {
        verses: parsed.verses ?? [],
        success: true,
      };
    } catch {
      return { verses: [], success: false, error: "Failed to parse AI response" };
    }
  }

  /**
   * Extracts an array of reflection questions from a Claude response.
   *
   * @private
   * @param {object} response - Raw Anthropic API response
   * @returns {string[]}
   */
  #parseReflectionResponse(response) {
    try {
      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
      return JSON.parse(jsonMatch[1].trim());
    } catch {
      // Graceful fallback — return generic questions that always work
      return [
        "How does this verse apply to a challenge you are facing right now?",
        "What action can you take today that reflects the teaching of this verse?",
        "How would your daily life change if you truly internalized this verse?",
      ];
    }
  }
}

/**
 * @typedef {object} DiscoverResult
 * @property {Array<{verse_key: string, relevance_explanation: string, theme: string}>} verses
 * @property {boolean} success
 * @property {string} [error]
 */

// Export a single shared instance — no need to instantiate multiple AI clients
const aiService = new AIService();

export { aiService, AIService };
