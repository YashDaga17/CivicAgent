"use client";

/**
 * ChatInput — Accessible chat input with voice input, location detect, and keyboard support.
 */

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, MapPin } from "lucide-react";
import VoiceInput from "./VoiceInput";
import { geocodeLocation } from "../lib/api";

interface ChatInputProps {
  onSend: (message: string) => void;
  onLocationDetected?: (state: string, district: string | null) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function ChatInput({ onSend, onLocationDetected, disabled, isLoading }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [locating, setLocating] = useState(false);
  const [locStatus, setLocStatus] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isLoading) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, isLoading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  };

  // Voice transcript → insert into input
  const handleVoiceTranscript = useCallback((text: string) => {
    setValue((prev) => {
      const newVal = prev ? `${prev} ${text}` : text;
      return newVal;
    });
    // Auto-focus the textarea
    textareaRef.current?.focus();
  }, []);

  // Browser GPS → Geocoding API → state
  const handleDetectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocStatus("GPS not supported");
      setTimeout(() => setLocStatus(null), 3000);
      return;
    }

    setLocating(true);
    setLocStatus("Detecting...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const result = await geocodeLocation(pos.coords.latitude, pos.coords.longitude);
          setLocStatus(`📍 ${result.state}`);
          if (onLocationDetected) {
            onLocationDetected(result.state, result.district);
          }
          // Also insert as context in chat
          setValue((prev) =>
            prev
              ? `${prev} (I'm in ${result.state})`
              : `I'm located in ${result.state}. What's the election timeline here?`
          );
          setTimeout(() => setLocStatus(null), 5000);
        } catch (err) {
          console.error("Geocode error:", err);
          setLocStatus("Location failed");
          setTimeout(() => setLocStatus(null), 3000);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.error("GPS error:", err);
        setLocating(false);
        setLocStatus("Location denied");
        setTimeout(() => setLocStatus(null), 3000);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [onLocationDetected]);

  return (
    <div className="w-full" role="form" aria-label="Chat input">
      <div
        className="glass-card flex items-end gap-2 p-2 sm:p-3 transition-all duration-200
                    focus-within:border-primary/40 focus-within:glow-primary-sm"
      >
        {/* Location detect button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDetectLocation}
          disabled={locating || disabled}
          className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0
                     transition-all duration-200 cursor-pointer
                     ${locStatus?.startsWith("📍")
                       ? "bg-green-500/15 text-green-400"
                       : "bg-bg-card text-text-secondary hover:text-primary-light hover:bg-primary/10"
                     }
                     disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Detect my location"
          title={locStatus || "Auto-detect my state via GPS"}
        >
          {locating ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <MapPin className="h-5 w-5" aria-hidden="true" />
          )}
        </motion.button>

        {/* Voice input */}
        <VoiceInput onTranscript={handleVoiceTranscript} disabled={disabled || isLoading} />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          placeholder="Ask about elections, Voter ID, timelines... or use 🎙️ voice"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm sm:text-base text-text-primary
                     placeholder:text-text-muted outline-none py-2 px-2 sm:px-3
                     disabled:opacity-50 max-h-[150px]"
          aria-label="Type your message"
          id="chat-input"
        />

        {/* Send button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={!value.trim() || disabled || isLoading}
          className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl
                     bg-primary text-white transition-all duration-200
                     hover:bg-primary-light disabled:opacity-30 disabled:cursor-not-allowed
                     cursor-pointer shrink-0"
          aria-label="Send message"
          id="send-button"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-5 w-5" aria-hidden="true" />
          )}
        </motion.button>
      </div>

      {/* Status bar */}
      <div className="mt-2 flex items-center justify-center gap-3 text-xs text-text-muted">
        {locStatus && (
          <span className={locStatus.startsWith("📍") ? "text-green-400 font-medium" : "text-text-muted"}>
            {locStatus}
          </span>
        )}
        <span>
          <kbd className="rounded bg-bg-card px-1.5 py-0.5 font-mono text-text-secondary">Enter</kbd> to send
          · <kbd className="rounded bg-bg-card px-1.5 py-0.5 font-mono text-text-secondary">Shift+Enter</kbd> for new line
        </span>
      </div>
    </div>
  );
}
