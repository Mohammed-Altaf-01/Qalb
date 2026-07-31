"use client";

import { useEffect, useState } from "react";

import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("qalb_theme");
    const light = saved === "light";
    setIsLight(light);
    document.documentElement.classList.toggle("light", light);
    setMounted(true);
  }, []);

  function toggle() {
    const next = !isLight;
    setIsLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("qalb_theme", next ? "light" : "dark");
  }

  if (!mounted) return <div className="w-8 h-8" />;

  return (
    <button
      onClick={toggle}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground
        hover:text-foreground hover:bg-muted/50 transition-colors duration-200"
    >
      {isLight ? <Moon size={16} strokeWidth={1.75} /> : <Sun size={16} strokeWidth={1.75} />}
    </button>
  );
}
