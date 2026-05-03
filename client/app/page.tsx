"use client";

/**
 * CivicAgent — Main chat page.
 *
 * Orchestrates the chat flow: empty state → user input → API call → timeline rendering.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Vote, ArrowDown } from "lucide-react";

import type { ChatMessage, ChatResponse } from "./types";
import { sendChatMessage } from "./lib/api";
import Header from "./components/Header";
import ChatInput from "./components/ChatInput";
import ChatMessageBubble from "./components/ChatMessage";
import SuggestedPrompts from "./components/SuggestedPrompts";

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Page Component ──────────────────────────────────────────────────────────

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Show/hide scroll-to-bottom button
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const handleScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setShowScrollBtn(!isNearBottom);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Health check on mount ─────────────────────────────────────────────────

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/health`
        );
        setIsConnected(res.ok);
      } catch {
        setIsConnected(false);
      }
    };
    check();
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (query: string) => {
      if (isLoading) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: query,
        timestamp: new Date(),
      };

      // Add loading placeholder
      const loadingMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setIsLoading(true);

      try {
        const response: ChatResponse = await sendChatMessage({ query });

        // Replace loading message with real response
        const assistantMsg: ChatMessage = {
          id: loadingMsg.id,
          role: "assistant",
          content: response.summary,
          timestamp: new Date(),
          data: response,
        };

        setMessages((prev) =>
          prev.map((m) => (m.id === loadingMsg.id ? assistantMsg : m))
        );
        setIsConnected(true);
      } catch (error) {
        console.error("Chat error:", error);

        const errorMsg: ChatMessage = {
          id: loadingMsg.id,
          role: "assistant",
          content:
            "I'm sorry, I couldn't process your request right now. Please make sure the backend server is running and try again.",
          timestamp: new Date(),
        };

        setMessages((prev) =>
          prev.map((m) => (m.id === loadingMsg.id ? errorMsg : m))
        );
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-dvh flex-col">
      <Header isConnected={isConnected} />

      {/* Chat area */}
      <main className="relative flex-1 overflow-hidden">
        <div
          ref={scrollAreaRef}
          className="h-full overflow-y-auto bg-gradient-chat"
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
        >
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
            {/* Empty state */}
            <AnimatePresence mode="wait">
              {isEmpty && (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center pt-8 sm:pt-16 pb-8"
                >
                  {/* Hero icon */}
                  <motion.div
                    animate={{
                      rotate: [0, -3, 3, 0],
                      scale: [1, 1.02, 1.02, 1],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="mb-6 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center
                               rounded-2xl bg-primary/10 glow-primary"
                  >
                    <Vote
                      className="h-10 w-10 sm:h-12 sm:w-12 text-primary-light"
                      aria-hidden="true"
                    />
                  </motion.div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-center gradient-text mb-3">
                    Your Election Guide
                  </h2>
                  <p className="text-sm sm:text-base text-text-secondary text-center max-w-md mb-8 leading-relaxed">
                    Ask me about voter registration, election timelines, polling
                    procedures, or Voter ID — personalized to your state in India.
                  </p>

                  <SuggestedPrompts onSelect={handleSend} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <div key={msg.id} className="mb-5">
                  <ChatMessageBubble message={msg} />
                </div>
              ))}
            </AnimatePresence>

            {/* Scroll anchor */}
            <div ref={bottomRef} aria-hidden="true" />
          </div>
        </div>

        {/* Scroll-to-bottom button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center
                         rounded-full bg-bg-card border border-border shadow-lg
                         hover:bg-bg-card-hover transition-colors cursor-pointer z-10"
              aria-label="Scroll to latest message"
            >
              <ArrowDown className="h-5 w-5 text-text-secondary" aria-hidden="true" />
            </motion.button>
          )}
        </AnimatePresence>
      </main>

      {/* Input bar */}
      <div className="border-t border-border bg-bg-primary/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4">
          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
