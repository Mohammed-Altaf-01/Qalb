/**
 * @fileoverview POST /api/ai/chat
 *
 * Streaming AI conversation grounded in a specific Quran verse.
 * Claude uses the Quran MCP server so every verse reference it makes
 * is verified — no hallucinations.
 *
 * Request body:
 *   messages    — conversation history: [{ role: "user"|"assistant", content: string }]
 *   verseContext — { verseKey, arabicText, translation, tafsirText, chapterName }
 *
 * Response: text/plain streaming — chunks arrive as Claude generates them.
 *
 * The client reads the stream with a ReadableStream reader and appends
 * each chunk to the displayed message in real time.
 */
import Anthropic from "@anthropic-ai/sdk";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { apiLog } from "@/lib/logger";
import { buildVersechatSystemPrompt } from "@/lib/prompts";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// System Prompt Builder
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST handler — streams a Claude response grounded in the given verse.
 *
 * @param {Request} request
 * @returns {Response} Streaming text/plain response
 */
export const POST = withLoggedRoute(async (request) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages, verseContext } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages array is required" }, { status: 400 });
  }

  if (!verseContext?.verseKey) {
    return Response.json({ error: "verseContext.verseKey is required" }, { status: 400 });
  }

  // Limit history to last 16 messages (8 exchanges) to control token cost
  const trimmedMessages = messages.slice(-16);

  const systemPrompt = buildVersechatSystemPrompt(verseContext);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          system: systemPrompt,
          messages: trimmedMessages,
          stream: true,
        });

        for await (const event of anthropicStream) {
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (error) {
        apiLog.error("verse_chat_stream_failed", { err: error });
        controller.enqueue(
          encoder.encode("I'm sorry, I encountered an error while processing your question. Please try again."),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      // Prevent buffering on proxies so chunks arrive immediately
      "Cache-Control": "no-cache, no-transform",
    },
  });
});
