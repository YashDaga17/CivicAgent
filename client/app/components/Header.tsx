"use client";

/**
 * Header — App branding bar with status indicator.
 */

import { motion } from "framer-motion";
import { Vote, Sparkles } from "lucide-react";

interface HeaderProps {
  isConnected: boolean;
}

export default function Header({ isConnected }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 border-b border-border bg-bg-primary/80 backdrop-blur-xl"
      role="banner"
    >
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 glow-primary-sm">
            <Vote className="h-6 w-6 text-primary-light" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight gradient-text">
              CivicAgent
            </h1>
            <p className="text-xs text-text-muted hidden sm:block">
              Election Process Guide
            </p>
          </div>
        </motion.div>

        {/* Status */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="flex items-center gap-2 rounded-full bg-bg-card px-3 py-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-success animate-pulse" : "bg-error"
              }`}
              aria-hidden="true"
            />
            <span className="text-text-secondary">
              {isConnected ? "Online" : "Offline"}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs text-accent-light">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI Powered
          </div>
        </motion.div>
      </div>
    </header>
  );
}
