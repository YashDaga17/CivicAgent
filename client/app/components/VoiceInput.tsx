"use client";

/**
 * VoiceInput — Record voice and convert to text via Cloud Speech-to-Text.
 * Uses browser MediaRecorder API to capture audio, sends to /api/voice.
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Loader2, Square } from "lucide-react";
import { voiceToText } from "../lib/api";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

interface SpeechRecognitionResultLike {
  readonly transcript: string;
}

interface SpeechRecognitionEventLike {
  readonly results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
}

interface SpeechRecognitionErrorEventLike {
  readonly error: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

export default function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const setTemporaryError = useCallback((message: string) => {
    setError(message);
    window.setTimeout(() => setError(null), 3000);
  }, []);

  const stopStreamTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (SpeechRecognitionCtor) {
      try {
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-IN";
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0]?.transcript ?? "")
            .join(" ")
            .trim();

          recognitionRef.current = null;
          setIsRecording(false);

          if (transcript) {
            onTranscript(transcript);
            return;
          }

          setTemporaryError("Could not hear anything clearly");
        };

        recognition.onerror = (event) => {
          recognitionRef.current = null;
          setIsRecording(false);
          setTemporaryError(
            event.error === "not-allowed"
              ? "Microphone permission denied"
              : "Voice input is unavailable right now"
          );
        };

        recognition.onend = () => {
          recognitionRef.current = null;
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
        setIsRecording(true);
        recognition.start();
        return;
      } catch (err) {
        console.error("Browser speech recognition failed, falling back:", err);
      }
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setTemporaryError("Voice input is not supported in this browser");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const mimeType =
        [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/ogg;codecs=opus",
        ].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stopStreamTracks();

        if (chunksRef.current.length === 0) {
          setIsRecording(false);
          return;
        }

        const blob = new Blob(chunksRef.current, {
          type: mimeType || chunksRef.current[0]?.type || "audio/webm",
        });
        setIsProcessing(true);
        setIsRecording(false);

        try {
          const result = await voiceToText(blob);
          if (result.text) {
            onTranscript(result.text);
          } else {
            setTemporaryError("Could not catch that. Try again");
          }
        } catch (err) {
          console.error("STT error:", err);
          setTemporaryError("Voice service unavailable");
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied:", err);
      stopStreamTracks();
      setTemporaryError("Microphone access denied");
    }
  }, [onTranscript, setTemporaryError, stopStreamTracks]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      return;
    }

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
            {isRecording ? "Listening..." : error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
