import type { ApplicationStatus } from "../domain/status";
import styles from "./status-badge.module.css";

/** Colour alone is not enough, so the status is always written out. */
export function StatusBadge({ status, label }: { status: ApplicationStatus; label: string }) {
  return (
    <span className={styles.badge} data-status={status}>
      {label}
    </span>
  );
}
