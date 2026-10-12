"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const sync = () => setTheme((document.documentElement.dataset.theme as Theme) || "light");
    sync();
    // Settings can change the theme too; keep this icon in step.
    window.addEventListener("gw-theme", sync);
    return () => window.removeEventListener("gw-theme", sync);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("gw-theme", next);
    } catch {
      /* storage can be unavailable; the toggle still works for this visit */
    }
    setTheme(next);
    window.dispatchEvent(new Event("gw-theme"));
  };

  const isDark = theme === "dark";
  return (
    <button className="iconbtn" onClick={toggle} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{ width: 34, height: 34 }}>
      <Icon name={isDark ? "sun" : "moon"} small />
    </button>
  );
}
