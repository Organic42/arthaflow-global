"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function StaggerGrid({
  children,
  className,
  delay = 0.1,
  inView = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  inView?: boolean;
}) {
  const props = inView
    ? { initial: "hidden", whileInView: "visible", viewport: { once: true, margin: "-50px" } }
    : { initial: "hidden", animate: "visible" };
  return (
    <motion.div
      className={className}
      {...props}
      variants={{
        visible: { transition: { staggerChildren: 0.07, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={cn(className)}
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
