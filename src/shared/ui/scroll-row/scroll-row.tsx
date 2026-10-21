"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../icon/icon";
import styles from "./scroll-row.module.css";

type ScrollRowProps = {
  /** Accessible name of the arrow button. */
  label: string;
  children: ReactNode;
  className?: string;
};

/**
 * A horizontally scrolling list with an arrow that appears while there is more to the right.
 * An item marked aria-current="true" is brought into view when the row first appears.
 */
export function ScrollRow({ label, children, className }: ScrollRowProps) {
  const list = useRef<HTMLUListElement>(null);
  const [hasMore, setHasMore] = useState(false);

  function update() {
    const element = list.current;
    if (!element) return;
    setHasMore(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
  }

  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const current = element.querySelector<HTMLElement>('[aria-current="true"]');
    if (current) {
      element.scrollLeft = current.offsetLeft - (element.clientWidth - current.offsetWidth) / 2;
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className={styles.wrap}>
      <ul
        ref={list}
        className={[styles.list, className].filter(Boolean).join(" ")}
        onScroll={update}
      >
        {children}
      </ul>
      {hasMore ? (
        <button
          type="button"
          className={styles.more}
          aria-label={label}
          onClick={() =>
            list.current?.scrollBy?.({ left: list.current.clientWidth * 0.6, behavior: "smooth" })
          }
        >
          <Icon name="next" size={20} />
        </button>
      ) : null}
    </div>
  );
}
