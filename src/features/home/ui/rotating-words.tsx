"use client";

import { useEffect, useState } from "react";
import styles from "./rotating-words.module.css";

const STEP_MS = 2600;

type RotatingWordsProps = {
  prefix: string;
  words: string[];
};

/**
 * A line such as "Заявки онлайн: вода" where the last word changes every few seconds.
 * Screen readers get the whole list once and skip the moving word. With reduced motion the
 * first word stays and nothing rotates.
 */
export function RotatingWords({ prefix, words }: RotatingWordsProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % words.length), STEP_MS);
    return () => clearInterval(timer);
  }, [words.length]);

  return (
    <p className={styles.line}>
      <span>{prefix}</span>{" "}
      <span className={styles.window}>
        <span key={index} className={styles.word} aria-hidden="true" data-testid="rotating-word">
          {words[index]}
        </span>
      </span>
      <span className="visually-hidden">{words.join(", ")}</span>
    </p>
  );
}
