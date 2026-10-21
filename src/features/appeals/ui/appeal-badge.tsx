import type { AppealStatus } from "../domain/appeal";
import styles from "./appeals.module.css";

type Tone = "new" | "work" | "done" | "problem";

export const APPEAL_TONES: Record<AppealStatus, Tone> = {
  registered: "new",
  sent_to_executor: "new",
  accepted: "work",
  info_required: "problem",
  in_review: "work",
  answer_ready: "work",
  executed: "done",
  closed: "done",
  redirected: "work",
  refused: "problem",
};

/** Colour alone is not enough, so the status is always written out. */
export function AppealBadge({ status, label }: { status: AppealStatus; label: string }) {
  return (
    <span className={styles.badge} data-tone={APPEAL_TONES[status]}>
      {label}
    </span>
  );
}
