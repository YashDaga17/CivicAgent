"use client";

/**
 * AudioButton — Plays text as speech via Cloud TTS.
 */

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Volume2, Loader2, VolumeX } from "lucide-react";
import { textToSpeech } from "../lib/api";

interface AudioButtonProps {
  text: string;
  languageCode?: string;
  size?: "sm" | "md";
}

export default function AudioButton({
  text,
  languageCode = "en-IN",
  size = "sm",
}: AudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = async () => {
    // If already playing, stop
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    try {
      const response = await textToSpeech({ text, language_code: languageCode });
      const audioSrc = `data:audio/mp3;base64,${response.audio_base64}`;
      const audio = new Audio(audioSrc);
      audioRef.current = audio;

      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
      };

      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("TTS unavailable:", err);
      setHasError(true);
      setTimeout(() => setHasError(false), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const btnSize = size === "sm" ? "h-7 w-7" : "h-9 w-9";

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handlePlay}
      disabled={isLoading}
      className={`flex ${btnSize} items-center justify-center rounded-lg
                 transition-all duration-200 cursor-pointer shrink-0
                 ${hasError
                   ? "bg-red-500/15 text-red-400"
                   : isPlaying
                     ? "bg-accent/20 text-accent-light"
                     : "bg-primary/10 text-primary-light hover:bg-primary/20"
                 }
                 disabled:opacity-40 disabled:cursor-not-allowed`}
      aria-label={hasError ? "Audio unavailable" : isPlaying ? "Stop audio" : "Listen to this text"}
      title={hasError ? "TTS not configured" : isPlaying ? "Stop" : "Listen"}
    >
      {isLoading ? (
        <Loader2 className={`${iconSize} animate-spin`} aria-hidden="true" />
      ) : isPlaying ? (
        <VolumeX className={iconSize} aria-hidden="true" />
      ) : (
        <Volume2 className={iconSize} aria-hidden="true" />
      )}
    </motion.button>
  );
}
