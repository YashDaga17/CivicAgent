"use client";

/**
 * VoiceInput — Record voice and convert to text via Cloud Speech-to-Text.
 * Uses browser MediaRecorder API to capture audio, sends to /api/voice.
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, Square } from "lucide-react";
import { voiceToText } from "../lib/api";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());

        if (chunksRef.current.length === 0) {
          setIsRecording(false);
          return;
        }

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setIsProcessing(true);
        setIsRecording(false);

        try {
          const result = await voiceToText(blob);
          if (result.text) {
            onTranscript(result.text);
          } else {
            setError("Couldn't catch that. Try again?");
            setTimeout(() => setError(null), 3000);
          }
        } catch (err) {
          console.error("STT error:", err);
          setError("Voice service unavailable");
          setTimeout(() => setError(null), 3000);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied:", err);
      setError("Microphone access denied");
      setTimeout(() => setError(null), 3000);
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="relative flex items-center">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        disabled={disabled || isProcessing}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl
                   transition-all duration-200 cursor-pointer shrink-0
                   ${isRecording
                     ? "bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20"
                     : isProcessing
                       ? "bg-accent/20 text-accent-light"
                       : error
                         ? "bg-red-500/10 text-red-400"
                         : "bg-bg-card text-text-secondary hover:text-primary-light hover:bg-primary/10"
                   }
                   disabled:opacity-40 disabled:cursor-not-allowed`}
        aria-label={isRecording ? "Stop recording" : isProcessing ? "Processing voice" : "Voice input"}
        title={isRecording ? "Stop recording" : "Speak your question"}
      >
        {/* Pulse ring while recording */}
        {isRecording && (
          <motion.span
            className="absolute inset-0 rounded-xl border-2 border-red-400"
            animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {isProcessing ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : isRecording ? (
          <Square className="h-4 w-4 fill-current" aria-hidden="true" />
        ) : (
          <Mic className="h-5 w-5" aria-hidden="true" />
        )}
      </motion.button>

      {/* Status tooltip */}
      <AnimatePresence>
        {(isRecording || error) && (
          <motion.span
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            className={`absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium
              ${isRecording ? "bg-red-500/15 text-red-400" : "bg-red-500/10 text-red-400"}`}
          >
            {isRecording ? "🎙️ Listening..." : error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
