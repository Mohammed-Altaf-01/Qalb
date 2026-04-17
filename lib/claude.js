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

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Quran MCP server URL — grounds all AI responses in verified Quranic text */
const QURAN_MCP_URL = "https://mcp.quran.ai/mcp";

/**
 * Shared system prompt preamble used by all AI methods.
 * Establishes the assistant's persona and accuracy constraints.
 */
const BASE_SYSTEM_PROMPT = `You are Qalb, a compassionate and knowledgeable Quran companion.
Your role is to help Muslims build a lasting, meaningful relationship with the Quran
beyond Ramadan by connecting the Quran's wisdom to their daily life experiences.

STRICT RULES:
- Only reference verses that exist in the Quran Foundation data you have access to.
- Never fabricate verse references or hadith.
- Be warm, non-judgmental, and encouraging — speak to every Muslim regardless of knowledge level.
- Responses must be concise and suitable for a mobile interface.
- All Arabic text must be accurate — use only what is provided by the API.`;

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

    /**
     * MCP server configuration pointing to the Quran Foundation server.
     * This grounds Claude's responses in verified Quranic sources.
     * @type {Array<object>}
     */
    this.mcpServers = [
      {
        type: "url",
        url: QURAN_MCP_URL,
        name: "quran-foundation",
      },
    ];
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
    // Build the contextual part of the prompt with any pre-fetched search results
    const searchContext =
      searchResults.length > 0
        ? `\n\nRelevant verses found via keyword search:\n${JSON.stringify(searchResults, null, 2)}`
        : "";

    const systemPrompt = `${BASE_SYSTEM_PROMPT}

When finding relevant verses:
1. Use the quran-foundation MCP tools to search for and verify verses.
2. Select exactly 3 verses most relevant to the user's situation.
3. For each verse, explain in 2–3 sentences why it speaks to their situation.
4. Keep explanations compassionate, practical, and grounded — not preachy.

Return your response as a JSON object with this exact shape:
{
  "verses": [
    {
      "verse_key": "chapter:verse",
      "relevance_explanation": "...",
      "theme": "one or two word theme label"
    }
  ]
}
${searchContext}`;

    const response = await this.client.beta.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `I'm going through something and want to find Quran verses that speak to my situation:\n\n"${userSituation}"\n\nPlease find 3 relevant verses and explain how each one relates to what I'm experiencing.`,
        },
      ],
      mcp_servers: this.mcpServers,
      betas: ["mcp-client-2025-04-04"],
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
    const tafsirContext = tafsirSnippet ? `\nTafsir context: ${tafsirSnippet}` : "";

    const systemPrompt = `${BASE_SYSTEM_PROMPT}

Generate exactly 3 personal reflection questions that help a Muslim internalize this verse.
Questions should:
- Be introspective and personal (start with "How...", "When...", "In what ways...")
- Connect the verse's teaching to modern daily life
- Range from immediate application to deeper spiritual growth
- Not be academic or quiz-like — they should invite genuine self-reflection

Return ONLY a JSON array of 3 strings: ["question 1", "question 2", "question 3"]`;

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Verse ${verseKey}: "${translation}"${tafsirContext}\n\nGenerate 3 personal reflection questions for this verse.`,
        },
      ],
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
