/**
 * @fileoverview POST /api/ai/read-summary
 *
 * Streaming AI summary for a page of Quran verses.
 * Returns 3 key themes + a running "journey so far" sentence if prior pages exist.
 *
 * Request body:
 *   surahName      — e.g. "Al-Baqarah"
 *   pageNumber     — current page index (1-based)
 *   verses         — [{ verseKey, arabic, translation }] for this page
 *   priorSummary   — string — cumulative summary from all previous pages (or "")
 *
 * Response: text/plain streaming
 */
import Anthropic from "@anthropic-ai/sdk";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { apiLog } from "@/lib/logger";
import { buildReadSummaryPrompt } from "@/lib/prompts";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const POST = withLoggedRoute(async (request) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { surahName, pageNumber, verses, priorSummary } = body;

  if (!Array.isArray(verses) || verses.length === 0) {
    return Response.json({ error: "verses array is required" }, { status: 400 });
  }

  const versesText = verses.map((v) => `[${v.verseKey}] ${v.translation}`).join("\n");

  const prompt = buildReadSummaryPrompt({ surahName, pageNumber, versesText, priorSummary });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }],
          stream: true,
        });

        for await (const event of anthropicStream) {
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (error) {
        apiLog.error("read_summary_stream_failed", { err: error });
        controller.enqueue(encoder.encode("Could not generate summary. Please try again."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
});
