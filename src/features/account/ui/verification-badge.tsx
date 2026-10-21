import type { VerificationStatus } from "../domain/property";
import styles from "./account.module.css";

/** Colour alone is not enough, so the status is always written out. */
export function VerificationBadge({
  status,
  label,
}: {
  status: VerificationStatus;
  label: string;
}) {
  return (
    <span className={styles.badge} data-status={status}>
      {label}
    </span>
  );
}
