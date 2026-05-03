"use client";

/**
 * CountdownTimer — Live countdown to a target election date.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface CountdownTimerProps {
  targetDate: string;
  label: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function parseDate(dateStr: string): Date | null {
  // Handle formats like "Nov 3, 2026", "Oct 22, 2026", "Multi-phase ..."
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  } catch {}
  return null;
}

export default function CountdownTimer({ targetDate, label }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isPast, setIsPast] = useState(false);

  useEffect(() => {
    const target = parseDate(targetDate);
    if (!target) return;

    const tick = () => {
      const now = new Date().getTime();
      const diff = target.getTime() - now;

      if (diff <= 0) {
        setIsPast(true);
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (isPast) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
        ✓ Completed
      </span>
    );
  }

  if (!timeLeft) return null;

  const blocks = [
    { value: timeLeft.days, unit: "D" },
    { value: timeLeft.hours, unit: "H" },
    { value: timeLeft.minutes, unit: "M" },
    { value: timeLeft.seconds, unit: "S" },
  ];

  const isUrgent = timeLeft.days < 7;

  return (
    <div className="flex items-center gap-1" aria-label={`${label}: ${timeLeft.days} days remaining`}>
      {blocks.map(({ value, unit }) => (
        <motion.div
          key={unit}
          className={`flex flex-col items-center px-1.5 py-1 rounded-md min-w-[32px]
            ${isUrgent ? "bg-red-500/10 border border-red-500/20" : "bg-primary/10 border border-primary/15"}`}
          animate={unit === "S" ? { scale: [1, 1.03, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <span className={`text-xs font-mono font-bold leading-none ${isUrgent ? "text-red-400" : "text-primary-light"}`}>
            {String(value).padStart(2, "0")}
          </span>
          <span className="text-[9px] text-text-muted leading-none mt-0.5">{unit}</span>
        </motion.div>
      ))}
    </div>
  );
}
