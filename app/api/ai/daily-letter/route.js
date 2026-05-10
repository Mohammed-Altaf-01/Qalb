import Anthropic from "@anthropic-ai/sdk";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { apiLog } from "@/lib/logger";
import { buildDailyLetterPrompt } from "@/lib/prompts";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const POST = withLoggedRoute(async (request) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "AI unavailable" }, { status: 503 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = buildDailyLetterPrompt({
    recentReflections: typeof body?.recentReflections === "string" ? body.recentReflections.slice(0, 4000) : "",
    topSurahs: typeof body?.topSurahs === "string" ? body.topSurahs.slice(0, 2000) : "",
    bookmarkedKeys: typeof body?.bookmarkedKeys === "string" ? body.bookmarkedKeys.slice(0, 4000) : "",
    lastDiscoverThemes: typeof body?.lastDiscoverThemes === "string" ? body.lastDiscoverThemes.slice(0, 2000) : "",
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 650,
          messages: [{ role: "user", content: prompt }],
          stream: true,
        });

        for await (const event of anthropicStream) {
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (error) {
        apiLog.error("daily_letter_stream_failed", { err: error });
        controller.enqueue(encoder.encode("Could not generate today's letter. Please try again later."));
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
