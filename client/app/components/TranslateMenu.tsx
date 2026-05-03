"use client";

/**
 * TranslateMenu — Dropdown to translate text into Indian regional languages.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Loader2, ChevronDown, Check } from "lucide-react";
import { translateText, getLanguages } from "../lib/api";
import type { SupportedLanguage } from "../types";

interface TranslateMenuProps {
  text: string;
  onTranslated: (translatedText: string, lang: string) => void;
}

export default function TranslateMenu({ text, onTranslated }: TranslateMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [languages, setLanguages] = useState<SupportedLanguage[]>([]);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch languages on mount
  useEffect(() => {
    getLanguages()
      .then(setLanguages)
      .catch(() => {
        // Fallback languages
        setLanguages([
          { code: "hi", name: "Hindi", native: "हिन्दी" },
          { code: "ta", name: "Tamil", native: "தமிழ்" },
          { code: "te", name: "Telugu", native: "తెలుగు" },
          { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
          { code: "bn", name: "Bengali", native: "বাংলা" },
          { code: "mr", name: "Marathi", native: "मराठी" },
          { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
          { code: "ml", name: "Malayalam", native: "മലയാളം" },
        ]);
      });
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleTranslate = async (langCode: string) => {
    if (langCode === "en") {
      onTranslated(text, "en");
      setSelectedLang(null);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setSelectedLang(langCode);
    try {
      const result = await translateText({
        text,
        target_language: langCode,
      });
      onTranslated(result.translated_text, langCode);
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const displayLangs = languages.filter((l) => l.code !== "en");

  return (
    <div ref={menuRef} className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium
                   transition-all duration-200 cursor-pointer
                   ${selectedLang
                     ? "bg-accent/15 text-accent-light"
                     : "bg-primary/10 text-primary-light hover:bg-primary/20"
                   }
                   disabled:opacity-40`}
        aria-label="Translate to regional language"
        aria-expanded={isOpen}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">
          {selectedLang
            ? languages.find((l) => l.code === selectedLang)?.native || "Translated"
            : "Translate"}
        </span>
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 z-50 w-48 glass-card p-1.5
                       shadow-xl border border-border overflow-hidden"
            role="menu"
            aria-label="Language selection"
          >
            {/* Reset to English */}
            {selectedLang && (
              <button
                onClick={() => handleTranslate("en")}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs
                           text-text-secondary hover:bg-bg-card-hover hover:text-text-primary
                           transition-colors cursor-pointer"
                role="menuitem"
              >
                <span className="flex-1 text-left">English (Original)</span>
              </button>
            )}
            {displayLangs.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleTranslate(lang.code)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs
                           text-text-secondary hover:bg-bg-card-hover hover:text-text-primary
                           transition-colors cursor-pointer"
                role="menuitem"
              >
                <span className="flex-1 text-left">
                  {lang.native}{" "}
                  <span className="text-text-muted">({lang.name})</span>
                </span>
                {selectedLang === lang.code && (
                  <Check className="h-3.5 w-3.5 text-accent-light" aria-hidden="true" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
