"use client";

/**
 * StateStats — Quick statistics card about the user's state.
 */

import { motion } from "framer-motion";
import { Users, MapPin, TrendingUp, Building2 } from "lucide-react";

const STATE_DATA: Record<string, { seats_ls: number; seats_vs: number; turnout: string; population: string }> = {
  "Maharashtra": { seats_ls: 48, seats_vs: 288, turnout: "61.4%", population: "12.3 Cr" },
  "Karnataka": { seats_ls: 28, seats_vs: 224, turnout: "72.4%", population: "6.7 Cr" },
  "Delhi": { seats_ls: 7, seats_vs: 70, turnout: "62.8%", population: "2.0 Cr" },
  "Tamil Nadu": { seats_ls: 39, seats_vs: 234, turnout: "72.5%", population: "7.7 Cr" },
  "Uttar Pradesh": { seats_ls: 80, seats_vs: 403, turnout: "60.5%", population: "22.0 Cr" },
  "West Bengal": { seats_ls: 42, seats_vs: 294, turnout: "77.7%", population: "9.9 Cr" },
  "Kerala": { seats_ls: 20, seats_vs: 140, turnout: "77.7%", population: "3.6 Cr" },
  "Gujarat": { seats_ls: 26, seats_vs: 182, turnout: "64.4%", population: "6.4 Cr" },
};

interface StateStatsProps {
  state: string;
}

export default function StateStats({ state }: StateStatsProps) {
  const data = STATE_DATA[state];
  if (!data) return null;

  const stats = [
    { icon: Building2, label: "Lok Sabha", value: `${data.seats_ls} seats`, color: "text-primary-light" },
    { icon: MapPin, label: "Vidhan Sabha", value: `${data.seats_vs} seats`, color: "text-accent-light" },
    { icon: TrendingUp, label: "Last Turnout", value: data.turnout, color: "text-green-400" },
    { icon: Users, label: "Population", value: data.population, color: "text-amber-400" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label={`${state} election statistics`}>
      {stats.map(({ icon: Icon, label, value, color }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex flex-col items-center p-3 rounded-xl bg-bg-card/60 border border-border"
        >
          <Icon className={`h-4 w-4 ${color} mb-1.5`} aria-hidden="true" />
          <motion.span
            className={`text-sm font-bold ${color}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          >
            {value}
          </motion.span>
          <span className="text-[10px] text-text-muted mt-0.5">{label}</span>
        </motion.div>
      ))}
    </div>
  );
}
