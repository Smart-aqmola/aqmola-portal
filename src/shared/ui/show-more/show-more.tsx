"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { format } from "@/shared/i18n/format";
import { Button } from "@/shared/ui/button/button";
import styles from "./show-more.module.css";

export const PAGE_SIZE = 20;

type ShowMoreListProps<T> = {
  items: readonly T[];
  labels: { shown: string; more: string };
  step?: number;
  children: (visible: readonly T[]) => ReactNode;
};

/**
 * Draws the first part of a long list and a button for the next one, so a register with hundreds
 * of records stays quick. The limit is kept when filters change: the list never jumps back.
 */
export function ShowMoreList<T>({
  items,
  labels,
  step = PAGE_SIZE,
  children,
}: ShowMoreListProps<T>) {
  const [limit, setLimit] = useState(step);
  const status = useRef<HTMLParagraphElement>(null);
  const clicked = useRef(false);
  const visible = items.length > limit ? items.slice(0, limit) : items;
  const rest = items.length - visible.length;

  // When the last part opens the button disappears; focus goes to the count, not to the page top.
  useEffect(() => {
    if (clicked.current && rest <= 0) status.current?.focus();
    clicked.current = false;
  }, [rest]);

  return (
    <>
      {children(visible)}
      {items.length > step && (
        <div className={styles.box}>
          <p ref={status} tabIndex={-1} className={styles.status} aria-live="polite">
            {format(labels.shown, { n: visible.length, total: items.length })}
          </p>
          {rest > 0 && (
            <Button
              variant="light"
              onClick={() => {
                clicked.current = true;
                setLimit((value) => value + step);
              }}
            >
              {format(labels.more, { n: Math.min(step, rest) })}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
