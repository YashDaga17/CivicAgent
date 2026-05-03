"use client";

/**
 * ChatMessage — Renders a single user or assistant message bubble.
 * Assistant messages include ElectionTimeline, audio, and translate controls.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "../types";
import ElectionTimeline from "./ElectionTimeline";
import AudioButton from "./AudioButton";
import TranslateMenu from "./TranslateMenu";

const messageVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 120, damping: 16 },
  },
};

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [displayText, setDisplayText] = useState<string | null>(null);

  const summaryText = displayText ?? message.content;

  const handleTranslated = (translated: string, lang: string) => {
    if (lang === "en") {
      setDisplayText(null); // Reset to original
    } else {
      setDisplayText(translated);
    }
  };

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      role="article"
      aria-label={`${isUser ? "Your" : "CivicAgent"} message`}
    >
      {/* Avatar */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                    ${isUser ? "bg-primary/20" : "bg-accent/15"}`}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="h-5 w-5 text-primary-light" />
        ) : (
          <Bot className="h-5 w-5 text-accent-light" />
        )}
      </div>

      {/* Content */}
      <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Loading indicator */}
        {message.isLoading && (
          <div className="chat-bubble-bot p-4">
            <div className="flex items-center gap-1.5">
              <span className="typing-dot h-2 w-2 rounded-full bg-text-muted" />
              <span className="typing-dot h-2 w-2 rounded-full bg-text-muted" />
              <span className="typing-dot h-2 w-2 rounded-full bg-text-muted" />
            </div>
          </div>
        )}

        {/* User message */}
        {isUser && !message.isLoading && (
          <div className="chat-bubble-user px-4 py-3">
            <p className="text-sm sm:text-base text-white leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        )}

        {/* Assistant message */}
        {!isUser && !message.isLoading && (
          <div className="space-y-4 w-full">
            {/* Summary text with audio + translate controls */}
            {summaryText && (
              <div className="chat-bubble-bot px-4 py-3 sm:px-5 sm:py-4">
                <p className="text-sm sm:text-base text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {summaryText}
                </p>
                {/* Controls row */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
                  <AudioButton text={summaryText} size="sm" />
                  <TranslateMenu
                    text={message.content}
                    onTranslated={handleTranslated}
                  />
                </div>
              </div>
            )}

            {/* Election Timeline */}
            {message.data && message.data.steps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="glass-card p-4 sm:p-6"
              >
                <ElectionTimeline
                  steps={message.data.steps}
                  userContext={message.data.user_context}
                />
              </motion.div>
            )}
          </div>
        )}

        {/* Timestamp */}
        {!message.isLoading && (
          <span className="mt-1.5 text-xs text-text-muted">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </motion.div>
  );
}
