"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./reveal.module.css";

type RevealProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Fades a block in when it scrolls into view. The server always sends the block visible, so a page
 * without scripts, with reduced motion, or in an old browser is never left with a blank hole.
 * Only blocks that start below the fold are hidden, and only after the page has loaded.
 */
export function Reveal({ children, className }: RevealProps) {
  const block = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = block.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    element.dataset.reveal = "hidden";
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = "shown";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={block} className={[styles.reveal, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
