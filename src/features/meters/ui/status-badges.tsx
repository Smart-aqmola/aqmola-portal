import type { RequestStatus } from "../domain/meter-request";
import type { ReadingStatus } from "../domain/reading";
import styles from "./meters.module.css";

type Tone = "new" | "work" | "done" | "problem";

const READING_TONES: Record<ReadingStatus, Tone> = {
  draft: "new",
  sent: "new",
  registered: "new",
  awaiting_check: "work",
  accepted: "done",
  rejected: "problem",
  clarification_required: "problem",
  passed_to_system: "done",
  processed: "done",
};

const REQUEST_TONES: Record<RequestStatus, Tone> = {
  registered: "new",
  in_progress: "work",
  info_requested: "problem",
  scheduled: "work",
  done: "done",
  rejected: "problem",
};

/** Colour alone is not enough, so the status is always written out. */
export function ReadingBadge({ status, label }: { status: ReadingStatus; label: string }) {
  return (
    <span className={styles.badge} data-tone={READING_TONES[status]}>
      {label}
    </span>
  );
}

export function RequestBadge({ status, label }: { status: RequestStatus; label: string }) {
  return (
    <span className={styles.badge} data-tone={REQUEST_TONES[status]}>
      {label}
    </span>
  );
}
