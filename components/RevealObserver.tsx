"use client";

import { useEffect } from "react";

/**
 * Adds `is-in` to every [data-reveal] element (and `.words` headline) once it
 * scrolls into view. Content stays visible without JavaScript because the
 * hidden starting state only applies under `html.js-reveal`.
 */
export default function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js-reveal");
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal], .words"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
