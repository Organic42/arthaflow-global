"use client";

import { useRef } from "react";
import { motion } from "motion/react";

interface AnimatedTabsProps {
  tabs: string[];
  activeTab: number;
  onChange: (i: number) => void;
  className?: string;
}

export function AnimatedTabs({
  tabs,
  activeTab,
  onChange,
  className = "",
}: AnimatedTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <div className={`relative flex overflow-x-auto border-b border-border ${className}`}>
      {tabs.map((t, i) => (
        <button
          key={i}
          ref={(el) => { tabRefs.current[i] = el; }}
          onClick={() => onChange(i)}
          className={`relative whitespace-nowrap pb-3.5 pr-6 text-sm font-medium transition-colors ${
            activeTab === i
              ? "text-action-blue"
              : "text-text-secondary hover:text-text-heading"
          }`}
        >
          {t}
          {activeTab === i && (
            <motion.div
              layoutId="tab-underline"
              className="absolute bottom-0 left-0 right-6 h-0.5 rounded-full bg-action-blue"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
