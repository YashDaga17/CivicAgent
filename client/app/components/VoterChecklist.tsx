"use client";

/**
 * VoterChecklist — Interactive voter readiness checklist.
 * Gamified progress tracker that makes election prep tangible.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Award,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  link?: string;
  linkLabel?: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "register",
    label: "Register as a voter",
    description: "Apply via Form 6 on the NVSP portal or Voter Helpline App",
    link: "https://voters.eci.gov.in/",
    linkLabel: "NVSP Portal",
  },
  {
    id: "epic",
    label: "Get your Voter ID (EPIC)",
    description: "Download your e-EPIC or collect your physical EPIC card",
    link: "https://voters.eci.gov.in/",
    linkLabel: "Download e-EPIC",
  },
  {
    id: "check-roll",
    label: "Verify name in electoral roll",
    description: "Search your name on the CEO website or Voter Helpline App",
    link: "https://electoralsearch.eci.gov.in/",
    linkLabel: "Search Now",
  },
  {
    id: "find-booth",
    label: "Find your polling booth",
    description: "Locate your assigned polling station before election day",
    link: "https://electoralsearch.eci.gov.in/",
    linkLabel: "Find Booth",
  },
  {
    id: "id-docs",
    label: "Keep photo ID ready",
    description: "EPIC, Aadhaar, PAN, Passport, or DL — any ECI-approved ID",
  },
  {
    id: "learn-evm",
    label: "Learn how to use the EVM",
    description: "Understand the Electronic Voting Machine and VVPAT process",
  },
];

interface VoterChecklistProps {
  state: string;
}

export default function VoterChecklist({ state }: VoterChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const progress = useMemo(
    () => Math.round((checked.size / CHECKLIST_ITEMS.length) * 100),
    [checked]
  );

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allDone = checked.size === CHECKLIST_ITEMS.length;

  return (
    <div className="w-full" role="region" aria-label="Voter Readiness Checklist">
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Award className="h-5 w-5 text-accent-light" aria-hidden="true" />
            Voter Readiness — {state}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {checked.size}/{CHECKLIST_ITEMS.length} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-primary-light">{progress}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-bg-card overflow-hidden mb-5">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: allDone
              ? "linear-gradient(90deg, #10b981, #34d399)"
              : "linear-gradient(90deg, var(--color-primary), var(--color-accent))",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
        />
      </div>

      {/* Completion celebration */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center"
          >
            <p className="text-sm font-semibold text-green-400">
              🎉 You&apos;re election ready! Every vote matters.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checklist items */}
      <div className="space-y-2" role="list">
        {CHECKLIST_ITEMS.map((item, i) => {
          const isDone = checked.has(item.id);
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              role="listitem"
            >
              <button
                onClick={() => toggle(item.id)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer group
                  ${isDone
                    ? "bg-green-500/8 border border-green-500/15"
                    : "bg-bg-card/50 border border-border hover:border-primary/30 hover:bg-bg-card"
                  }`}
                aria-pressed={isDone}
              >
                <motion.div
                  animate={{ scale: isDone ? [1, 1.3, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                  className="mt-0.5 shrink-0"
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-text-muted group-hover:text-primary-light" />
                  )}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isDone ? "text-green-400 line-through" : "text-text-primary"}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                  {item.link && !isDone && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-primary-light hover:text-accent-light transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {item.linkLabel}
                      <ChevronRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
