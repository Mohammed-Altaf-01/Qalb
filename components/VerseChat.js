/**
 * @fileoverview VerseChat — "Talk to this Verse" AI Chat Component
 *
 * A streaming chat interface grounded in a specific Quran verse.
 * Claude answers using the verse's tafsir as context and the Quran MCP
 * server to look up any related verses — so every reference is verified.
 *
 * UX flow:
 *  1. User taps "Talk to this Verse" toggle button
 *  2. Quick-start chips appear — one tap to fire a pre-written question
 *  3. User types or selects a question → response streams in word-by-word
 *  4. Conversation history is kept in state for multi-turn dialogue
 *
 * Design decisions:
 *  - Streaming via ReadableStream reader for live "typing" feel
 *  - Three animated dots while waiting for first token (MCP tool call delay)
 *  - ringKey pattern: resets on each open so chips always show fresh
 *  - Max 16 messages trimmed server-side to control token cost
 */

"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quick-start chips shown when the chat is empty.
 * Give first-time users an easy entry point.
 */
const QUICK_STARTERS = [
  "What does this verse mean?",
  "How do I apply this today?",
  "What did scholars say about this?",
  "Find me a related verse",
  "Why was this revealed?",
  "How does this connect to daily life?",
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single chat bubble — right-aligned for user, left-aligned for assistant.
 * @param {{ role: "user"|"assistant", content: string, isStreaming?: boolean }} props
 */
function ChatBubble({ role, content, isStreaming = false }) {
  const isUser = role === "user";

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center mr-2 mt-0.5 shrink-0">
          <Sparkles size={10} className="text-accent" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
          isUser
            ? "bg-primary/25 border border-primary/25 rounded-br-sm text-foreground/90"
            : "bg-muted/50 border border-border/50 rounded-bl-sm text-foreground/85",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <div className="chat-markdown break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {isStreaming && (
              <span
                className="inline-block w-0.5 h-3.5 bg-accent/70 ml-0.5 align-middle animate-pulse"
                aria-hidden="true"
              />
            )}
          </div>
        )}
        {isUser && isStreaming && (
          <span
            className="inline-block w-0.5 h-3.5 bg-accent/70 ml-0.5 align-middle animate-pulse"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Three animated dots shown while waiting for the first streaming token.
 * The MCP tool call causes a delay before text starts — this fills it.
 */
function ThinkingDots() {
  return (
    <div className="flex justify-start">
      <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center mr-2 mt-0.5 shrink-0">
        <Sparkles size={10} className="text-accent" />
      </div>
      <div className="px-3.5 py-3 rounded-2xl rounded-bl-sm bg-muted/50 border border-border/50 flex items-center gap-1">
        {[0, 160, 320].map((delay) => (
          <div
            key={delay}
            className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * "Talk to this Verse" — streaming AI chat grounded in one Quran verse.
 *
 * @param {{
 *   verseKey: string,
 *   arabicText: string,
 *   translation: string,
 *   tafsirText: string,
 *   chapterName: string
 * }} props
 */
export default function VerseChat({ verseKey, arabicText, translation, tafsirText, chapterName }) {
  const [isOpen, setIsOpen] = useState(false);
  /** Full committed conversation history for multi-turn context */
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  /** True while a fetch/stream is in flight */
  const [streaming, setStreaming] = useState(false);
  /** Accumulates streamed text before committing to messages */
  const [streamingText, setStreamingText] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // ── Core send logic ────────────────────────────────────────────────────────

  /**
   * Sends a user message and streams the assistant reply.
   * @param {string} text - The message to send
   */
  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg = { role: "user", content: trimmed };
    const updatedHistory = [...messages, userMsg];

    setMessages(updatedHistory);
    setInput("");
    setStreaming(true);
    setStreamingText("");

    const verseContext = { verseKey, arabicText, translation, tafsirText, chapterName };

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedHistory, verseContext }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Read the stream chunk by chunk and append to displayed text
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamingText(fullText);
      }

      // Commit the completed assistant message to history
      setMessages((prev) => [...prev, { role: "assistant", content: fullText }]);
    } catch (err) {
      console.error("[VerseChat] stream error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setStreaming(false);
      setStreamingText("");
    }
  }

  // ── Keyboard handler ───────────────────────────────────────────────────────

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section aria-label="Talk to this verse">
      {/* ── Toggle button ───────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200",
          isOpen
            ? "border-accent/50 bg-accent/8 text-foreground"
            : "border-dashed border-accent/35 bg-accent/5 hover:bg-accent/10 hover:border-accent/50",
        )}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <MessageCircle size={15} className="text-accent shrink-0" />
          <span className="text-sm font-semibold text-foreground">Talk to this Verse</span>
          <span className="hidden sm:inline text-[10px] text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded-full border border-border/40">
            Claude AI · Quran MCP
          </span>
        </div>
        {isOpen ? (
          <X size={14} className="text-muted-foreground shrink-0" />
        ) : (
          <Sparkles size={13} className="text-accent/60 shrink-0" />
        )}
      </button>

      {/* ── Chat panel ──────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="mt-2 rounded-2xl border border-border/50 bg-card overflow-hidden animate-fade-in-up">
          {/* Verse context pill */}
          <div className="px-4 py-2.5 border-b border-border/30 bg-muted/20 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
            <p className="text-[11px] text-muted-foreground truncate">
              Discussing <span className="text-foreground/80 font-medium">{verseKey}</span>
              {chapterName ? ` · ${chapterName}` : ""}
            </p>
          </div>

          {/* Message list */}
          <div className="min-h-[160px] max-h-[400px] overflow-y-auto px-4 py-4 space-y-3">
            {/* Empty state — quick-start chips */}
            {messages.length === 0 && !streaming && (
              <div className="space-y-3">
                <p className="text-[11px] text-muted-foreground/60 text-center">Ask anything about this verse</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_STARTERS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-[11px] px-3 py-1.5 rounded-full border border-border/60 bg-muted/40
                        hover:border-accent/50 hover:bg-accent/10 hover:text-accent
                        transition-all duration-150 text-foreground/70"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Committed messages */}
            {messages.map((msg, i) => (
              <ChatBubble key={i} role={msg.role} content={msg.content} />
            ))}

            {/* In-flight streaming message */}
            {streaming &&
              (streamingText ? <ChatBubble role="assistant" content={streamingText} isStreaming /> : <ThinkingDots />)}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-border/30 px-3 py-2.5 flex items-center gap-2 bg-muted/10">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this verse…"
              maxLength={500}
              disabled={streaming}
              aria-label="Chat message input"
              className="flex-1 text-sm bg-transparent outline-none text-foreground
                placeholder:text-muted-foreground/40 disabled:opacity-40 min-w-0"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              aria-label="Send message"
              className="p-1.5 rounded-lg bg-primary/20 border border-primary/20
                hover:bg-primary/35 text-accent
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-all duration-150 active:scale-90 shrink-0"
            >
              <Send size={14} />
            </button>
          </div>

          {/* Footer note */}
          <p className="text-[10px] text-muted-foreground/40 text-center pb-2 px-4">
            Verse references verified by Quran Foundation MCP · May make mistakes
          </p>
        </div>
      )}
    </section>
  );
}
