"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import { MessageCircle, Send, Sparkles, Trash2, X } from "lucide-react";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

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
 * @param {{
 *   verseKey: string,
 *   arabicText: string,
 *   translation: string,
 *   tafsirText: string,
 *   chapterName: string,
 *   inline?: boolean,           // true = always-open tab mode, no toggle button
 *   initialMessages?: object[], // restored chat history from localStorage
 *   onHistoryChange?: Function, // called with updated messages array on each turn
 * }} props
 */
export default function VerseChat({
  verseKey,
  arabicText,
  translation,
  tafsirText,
  chapterName,
  inline = false,
  initialMessages = [],
  onHistoryChange,
}) {
  const [isOpen, setIsOpen] = useState(inline);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  // ── Send ──────────────────────────────────────────────────────────────────

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg = { role: "user", content: trimmed };
    const updatedHistory = [...messages, userMsg];

    setMessages(updatedHistory);
    setInput("");
    setStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedHistory,
          verseContext: { verseKey, arabicText, translation, tafsirText, chapterName },
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamingText(fullText);
      }

      const finalMessages = [...updatedHistory, { role: "assistant", content: fullText }];
      setMessages(finalMessages);
      onHistoryChange?.(finalMessages);
    } catch (err) {
      console.error("[VerseChat] stream error:", err);
      const errorMessages = [
        ...updatedHistory,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ];
      setMessages(errorMessages);
      onHistoryChange?.(errorMessages);
    } finally {
      setStreaming(false);
      setStreamingText("");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearHistory() {
    setMessages([]);
    onHistoryChange?.([]);
  }

  // ── Render: toggle mode (used outside a dedicated tab) ────────────────────
  if (!inline) {
    return (
      <section aria-label="Talk to this verse">
        <button
          onClick={() => setIsOpen((v) => !v)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors duration-200",
            isOpen
              ? "border-accent/50 bg-accent/8 text-foreground"
              : "border-dashed border-accent/35 bg-accent/5 hover:bg-accent/10 hover:border-accent/50",
          )}
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2.5">
            <MessageCircle size={15} className="text-accent shrink-0" />
            <span className="text-sm font-semibold text-foreground">Talk to this Verse</span>
          </div>
          {isOpen ? (
            <X size={14} className="text-muted-foreground shrink-0" />
          ) : (
            <Sparkles size={13} className="text-accent/60 shrink-0" />
          )}
        </button>
        {isOpen && (
          <ChatPanel
            {...{
              messages,
              streaming,
              streamingText,
              input,
              setInput,
              handleKeyDown,
              sendMessage,
              messagesEndRef,
              inputRef,
              clearHistory,
              verseKey,
              chapterName,
            }}
          />
        )}
      </section>
    );
  }

  // ── Render: inline tab mode ────────────────────────────────────────────────
  return (
    <section aria-label="Talk to this verse" className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageCircle size={14} className="text-accent" />
          <span className="text-sm font-semibold text-foreground">Talk to this Verse</span>
          <span className="text-[10px] text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded-full border border-border/40">
            Claude AI
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-destructive transition-colors"
            title="Clear chat history"
          >
            <Trash2 size={11} />
            Clear
          </button>
        )}
      </div>

      <ChatPanel
        inline
        messages={messages}
        streaming={streaming}
        streamingText={streamingText}
        input={input}
        setInput={setInput}
        handleKeyDown={handleKeyDown}
        sendMessage={sendMessage}
        messagesEndRef={messagesEndRef}
        inputRef={inputRef}
        clearHistory={clearHistory}
        verseKey={verseKey}
        chapterName={chapterName}
      />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatPanel — shared between inline and toggle modes
// ─────────────────────────────────────────────────────────────────────────────

function ChatPanel({
  inline,
  messages,
  streaming,
  streamingText,
  input,
  setInput,
  handleKeyDown,
  sendMessage,
  messagesEndRef,
  inputRef,
  chapterName,
  verseKey,
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-card overflow-hidden",
        inline ? "" : "mt-2 animate-fade-in-up",
      )}
    >
      {/* Verse context pill */}
      {!inline && (
        <div className="px-4 py-2.5 border-b border-border/30 bg-muted/20 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          <p className="text-[11px] text-muted-foreground truncate">
            Discussing <span className="text-foreground/80 font-medium">{verseKey}</span>
            {chapterName ? ` · ${chapterName}` : ""}
          </p>
        </div>
      )}

      {/* Messages */}
      <div
        className={cn(
          "overflow-y-auto px-4 py-4 space-y-3",
          inline ? "min-h-[420px] max-h-[580px]" : "min-h-[160px] max-h-[400px]",
        )}
      >
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
                    transition-colors duration-150 text-foreground/70"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatBubble key={i} role={msg.role} content={msg.content} />
        ))}

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
          className="flex-1 text-sm bg-transparent outline-none text-foreground
            placeholder:text-muted-foreground/40 disabled:opacity-40 min-w-0"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
          className="p-1.5 rounded-lg bg-primary/20 border border-primary/20
            hover:bg-primary/35 text-accent
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-[color,background-color,opacity,transform] duration-150 active:scale-95 shrink-0"
        >
          <Send size={14} />
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground/40 text-center pb-2 px-4">
        Responses are AI-generated · May make mistakes
      </p>
    </div>
  );
}
