"use client";

/**
 * SuggestedPrompts — Pre-built query cards for Indian elections.
 */

import { motion } from "framer-motion";
import { MapPin, CalendarDays, FileText, HelpCircle } from "lucide-react";

const PROMPTS = [
  {
    icon: MapPin,
    label: "Maharashtra Timeline",
    query: "What is the election timeline for a first-time voter in Maharashtra?",
    color: "text-primary-light",
    bgColor: "bg-primary/10",
  },
  {
    icon: CalendarDays,
    label: "Karnataka Elections",
    query: "When are the elections in Karnataka and how do I register?",
    color: "text-accent-light",
    bgColor: "bg-accent/10",
  },
  {
    icon: FileText,
    label: "Voter ID Registration",
    query: "How do I apply for a Voter ID card in Tamil Nadu using Form 6?",
    color: "text-success-light",
    bgColor: "bg-success/10",
  },
  {
    icon: HelpCircle,
    label: "Delhi Voting Guide",
    query: "I live in Delhi (110001). How do I check my name in the electoral roll?",
    color: "text-primary-light",
    bgColor: "bg-primary/10",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 120, damping: 14 },
  },
};

interface SuggestedPromptsProps {
  onSelect: (query: string) => void;
}

export default function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      role="group"
      aria-label="Suggested questions"
    >
      {PROMPTS.map((prompt) => {
        const Icon = prompt.icon;
        return (
          <motion.button
            key={prompt.label}
            variants={cardVariants}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(prompt.query)}
            className="glass-card glass-card-hover p-4 text-left transition-all duration-200
                       cursor-pointer group"
            aria-label={`Ask: ${prompt.query}`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${prompt.bgColor} shrink-0`}>
                <Icon className={`h-5 w-5 ${prompt.color}`} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary group-hover:text-primary-light transition-colors">
                  {prompt.label}
                </p>
                <p className="mt-0.5 text-xs text-text-muted line-clamp-2 leading-relaxed">
                  {prompt.query}
                </p>
              </div>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
