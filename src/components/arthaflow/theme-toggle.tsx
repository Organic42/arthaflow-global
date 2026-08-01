"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Theme toggle.
 *
 * The DOM class is the source of truth, not React state. A blocking script in
 * the root layout applies it before first paint, so by the time this mounts the
 * answer already exists on `documentElement` — reading it is correct, whereas
 * the previous version read localStorage in an effect and called setState,
 * which meant a render at the wrong theme followed by a second render to fix
 * it. That is the visible flash of white on a dark-theme reload, and it is what
 * react-hooks/set-state-in-effect was pointing at.
 */

function subscribe(onChange: () => void) {
  // The class can change from this component or from another tab's storage
  // event, so observe the attribute rather than assuming we are the only writer.
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle() {
  // Server renders light, which matches the layout's default and the class the
  // blocking script writes before hydration — so there is no mismatch to warn
  // about.
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("arthaflow-theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
