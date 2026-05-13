/**
 * Claude AI Service — Mobile version.
 *
 * All AI calls are proxied through the Vercel-deployed Next.js API routes.
 * This keeps the Anthropic API key secret (never bundled in the mobile app).
 *
 * Set `EXPO_PUBLIC_API_BASE_URL` in `qalb_mobile/.env` (see `.env.example`).
 * For local dev on a device, use your machine's LAN IP — not localhost.
 *
 * Supports streaming for chat (text appears incrementally via onChunk callback).
 * Discover/Reflect use regular JSON responses for simplicity.
 */
import { CONFIG } from "../config";

const base = () => CONFIG.API_BASE_URL;

export const aiService = {
  /**
   * Find verses matching a user's life situation.
   * Calls POST /api/ai/discover on the Vercel backend.
   * @returns {Promise<{ verses: Array, success: boolean }>}
   */
  async discoverVerses(userSituation) {
    const res = await fetch(`${base()}/api/ai/discover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: userSituation }),
    });
    if (!res.ok) throw new Error(`Discover failed: ${res.status}`);

    // The web endpoint streams text, so we buffer the full body first
    const text = await res.text();

    // Try to parse JSON from the response
    try {
      // Strip markdown code fences if present
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
      const parsed = JSON.parse(jsonMatch[1].trim());
      return { verses: parsed.verses ?? [], success: true };
    } catch {
      // Try raw parse
      try {
        const parsed = JSON.parse(text);
        return { verses: parsed.verses ?? [], success: true };
      } catch {
        return { verses: [], success: false, error: "Failed to parse AI response" };
      }
    }
  },

  /**
   * Generate 3 reflection questions for a verse.
   * Calls POST /api/ai/reflect on the Vercel backend.
   * @returns {Promise<string[]>}
   */
  async generateReflectionPrompts(verseKey, arabicText, translation, tafsirSnippet = "") {
    const res = await fetch(`${base()}/api/ai/reflect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verseKey, arabicText, translation, tafsirSnippet }),
    });
    if (!res.ok) throw new Error(`Reflect failed: ${res.status}`);

    const text = await res.text();
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
      return JSON.parse(jsonMatch[1].trim());
    } catch {
      return [
        "How does this verse apply to a challenge you are facing right now?",
        "What action can you take today that reflects the teaching of this verse?",
        "How would your daily life change if you truly internalized this verse?",
      ];
    }
  },

  /**
   * Streaming verse chat — calls POST /api/ai/chat.
   * @param {Array} messages - Conversation history
   * @param {object} verseContext - { verseKey, arabicText, translation, tafsirText, chapterName }
   * @param {(text: string) => void} onChunk - Called with accumulated text on each chunk
   * @param {(text: string) => void} onDone - Called with final full text
   */
  async chatStream(messages, verseContext, onChunk, onDone) {
    const res = await fetch(`${base()}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, verseContext }),
    });
    if (!res.ok) throw new Error(`Chat failed: ${res.status}`);

    if (!res.body) {
      // Fallback: no streaming support, read full text
      const text = await res.text();
      onChunk(text);
      onDone(text);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
      onChunk(fullText);
    }
    onDone(fullText);
  },

  /**
   * Reading page AI summary — calls POST /api/ai/read-summary.
   * Buffers full response (non-streaming) for simplicity on mobile.
   * @returns {Promise<string>} Full summary text
   */
  async readSummary({ surahName, pageNumber, versesText, priorSummary = "" }) {
    const res = await fetch(`${base()}/api/ai/read-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surahName, pageNumber, versesText, priorSummary }),
    });
    if (!res.ok) throw new Error(`Read summary failed: ${res.status}`);
    return res.text();
  },
};
