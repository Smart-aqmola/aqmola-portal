import styles from "./cabinet.module.css";

export type Tone = "new" | "work" | "done" | "problem";

/** A status written out with a colour hint; colour alone is not enough. */
export function ToneBadge({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className={styles.badge} data-tone={tone}>
      {label}
    </span>
  );
}
