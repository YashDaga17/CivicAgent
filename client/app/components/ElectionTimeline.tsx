"use client";

/**
 * ElectionTimeline — Interactive vertical stepper with Framer Motion animations.
 *
 * Renders the backend's `steps[]` as a beautifully animated timeline with
 * staggered entrance, expandable cards, and action links.
 */

import { createElement, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck,
  FileText,
  UserMinus,
  VolumeX,
  CalendarDays,
  Vote,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  MapPin,
} from "lucide-react";
import type { TimelineStep, UserContext } from "../types";
import AudioButton from "./AudioButton";

// ── Icon mapping ────────────────────────────────────────────────────────────

const STEP_ICONS: Record<string, React.ElementType> = {
  "voter registration": ClipboardCheck,
  "form 6": ClipboardCheck,
  "nomination": FileText,
  "withdrawal": UserMinus,
  "campaign": VolumeX,
  "silence": VolumeX,
  "polling": Vote,
  "counting": ShieldCheck,
  "results": ShieldCheck,
};

function getStepIcon(title: string): React.ElementType {
  const lower = title.toLowerCase();
  for (const [key, icon] of Object.entries(STEP_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return CalendarDays;
}

const OFFICIAL_STATE_PORTALS: Record<string, string> = {
  Karnataka: "https://ceokarnataka.kar.nic.in/",
  Delhi: "https://ceodelhi.gov.in/",
  "Tamil Nadu": "https://www.elections.tn.gov.in/",
  "Uttar Pradesh": "https://ceouttarpradesh.nic.in/",
  "West Bengal": "https://ceowestbengal.nic.in/",
  Kerala: "https://www.ceo.kerala.gov.in/",
  Gujarat: "https://ceo.gujarat.gov.in/",
};

function getOfficialActionLink(step: TimelineStep, userContext: UserContext): string {
  const lower = step.title.toLowerCase();
  const statePortal = OFFICIAL_STATE_PORTALS[userContext.state] ?? step.action_link;

  if (lower.includes("registration") || lower.includes("form 6")) {
    return "https://voters.eci.gov.in/";
  }

  if (lower.includes("polling")) {
    return "https://electoralsearch.eci.gov.in/";
  }

  if (
    lower.includes("nomination") ||
    lower.includes("withdrawal") ||
    lower.includes("campaign")
  ) {
    return statePortal || "https://eci.gov.in/";
  }

  return step.action_link || statePortal || "https://eci.gov.in/";
}

function getActionLabel(step: TimelineStep): string {
  const lower = step.title.toLowerCase();

  if (lower.includes("registration") || lower.includes("form 6")) {
    return "Register Online";
  }

  if (lower.includes("polling")) {
    return "Find Booth and Roll Details";
  }

  if (lower.includes("counting") || lower.includes("results")) {
    return "View Official Results Hub";
  }

  return "Open Official Guidance";
}

// ── Step status ─────────────────────────────────────────────────────────────

type StepStatus = "upcoming" | "current" | "past";

function getStepStatus(dateStr: string): StepStatus {
  // Simple heuristic: if the date includes "2026" parse it
  try {
    const now = new Date();
    // Try to parse the date — handles "Oct 22, 2026" format
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const diff = parsed.getTime() - now.getTime();
      const daysDiff = diff / (1000 * 60 * 60 * 24);
      if (daysDiff < 0) return "past";
      if (daysDiff < 14) return "current"; // Within 2 weeks = current
      return "upcoming";
    }
  } catch {
    // fall through
  }
  return "upcoming";
}

// ── Animations ──────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const stepVariants = {
  hidden: { opacity: 0, x: -30, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

const dotVariants = {
  hidden: { scale: 0 },
  visible: {
    scale: 1,
    transition: { type: "spring" as const, stiffness: 200, damping: 12, delay: 0.1 },
  },
};

const expandVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

// ── Subcomponents ───────────────────────────────────────────────────────────

interface TimelineStepCardProps {
  step: TimelineStep;
  userContext: UserContext;
  isExpanded: boolean;
  onToggle: () => void;
}

function TimelineStepCard({
  step,
  userContext,
  isExpanded,
  onToggle,
}: TimelineStepCardProps) {
  const Icon = getStepIcon(step.title);
  const status = getStepStatus(step.date);
  const actionUrl = getOfficialActionLink(step, userContext);
  const actionLabel = getActionLabel(step);

  const dotColorClass =
    status === "past"
      ? "bg-success"
      : status === "current"
        ? "bg-timeline-dot-active"
        : "bg-timeline-dot";

  const dotExtraClass =
    status === "current"
      ? "timeline-dot-active"
      : "timeline-dot";

  return (
    <motion.div
      variants={stepVariants}
      className="relative flex gap-4 sm:gap-6"
      role="listitem"
      aria-label={`Step ${step.step}: ${step.title} — ${step.date}`}
    >
      {/* Dot */}
      <div className="relative flex flex-col items-center">
        <motion.div
          variants={dotVariants}
          className={`z-10 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full ${dotColorClass} ${dotExtraClass}`}
        >
          {createElement(Icon, {
            className: "h-5 w-5 sm:h-6 sm:w-6 text-white",
            "aria-hidden": true,
          })}
        </motion.div>
        {/* Connecting line (hidden on last item via parent) */}
        <div className="timeline-line w-0.5 grow" aria-hidden="true" />
      </div>

      {/* Card */}
      <div className="flex-1 pb-8 sm:pb-10">
        <button
          onClick={onToggle}
          className="w-full text-left glass-card glass-card-hover p-4 sm:p-5 cursor-pointer transition-all duration-200 group"
          aria-expanded={isExpanded}
          aria-controls={`step-detail-${step.step}`}
          id={`step-toggle-${step.step}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-semibold tracking-wider uppercase text-text-muted">
                  Step {step.step}
                </span>
                {status === "current" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary-light">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-light animate-pulse" />
                    Coming Up
                  </span>
                )}
                {status === "past" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success-light">
                    Completed
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-text-primary group-hover:text-primary-light transition-colors">
                {step.title}
              </h3>
              <p className="mt-1 text-sm font-medium text-accent flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {step.date}
              </p>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="mt-1 text-text-muted group-hover:text-text-secondary"
            >
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            </motion.div>
          </div>
        </button>

        {/* Expandable detail */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              key={`detail-${step.step}`}
              variants={expandVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              className="overflow-hidden"
              id={`step-detail-${step.step}`}
              role="region"
              aria-labelledby={`step-toggle-${step.step}`}
            >
              <div className="glass-card mt-2 p-4 sm:p-5 border-l-2 border-primary/30">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm leading-relaxed text-text-secondary flex-1">
                    {step.description}
                  </p>
                  <AudioButton text={`${step.title}. ${step.date}. ${step.description}`} />
                </div>
                {actionUrl && (
                  <a
                    href={actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2.5
                               text-sm font-medium text-primary-light hover:bg-primary/20
                               transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`Take action: ${step.title} — opens in new tab`}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    {actionLabel}
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

interface ElectionTimelineProps {
  steps: TimelineStep[];
  userContext: UserContext;
}

export default function ElectionTimeline({
  steps,
  userContext,
}: ElectionTimelineProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(
    new Set([1]) // First step expanded by default
  );

  const toggleStep = (stepNum: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNum)) {
        next.delete(stepNum);
      } else {
        next.add(stepNum);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSteps(new Set(steps.map((s) => s.step)));
  };

  const collapseAll = () => {
    setExpandedSteps(new Set());
  };

  const allExpanded = expandedSteps.size === steps.length;

  return (
    <div className="w-full" role="region" aria-label="Election Timeline">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
            <MapPin className="h-5 w-5 text-primary-light" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              {userContext.state} Election Timeline
            </h2>
            <p className="text-xs text-text-muted">
              {userContext.voter_status === "first-time"
                ? "First-time voter guide"
                : userContext.voter_status === "returning"
                  ? "Returning voter guide"
                  : "Voter guide"}
              {userContext.district && ` · ${userContext.district}`}
            </p>
          </div>
        </div>

        <button
          onClick={allExpanded ? collapseAll : expandAll}
          className="self-start text-xs font-medium text-text-muted hover:text-text-secondary
                     transition-colors px-3 py-1.5 rounded-md hover:bg-bg-card cursor-pointer"
          aria-label={allExpanded ? "Collapse all steps" : "Expand all steps"}
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {/* Timeline */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative"
        role="list"
        aria-label="Election process steps"
      >
        {steps.map((step) => (
          <TimelineStepCard
            key={step.step}
            step={step}
            userContext={userContext}
            isExpanded={expandedSteps.has(step.step)}
            onToggle={() => toggleStep(step.step)}
          />
        ))}
      </motion.div>
    </div>
  );
}
