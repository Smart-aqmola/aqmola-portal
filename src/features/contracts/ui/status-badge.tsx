import type { ContractStatus } from "../domain/contract";
import styles from "./contracts.module.css";

type Tone = "new" | "work" | "done" | "problem";

const TONES: Record<ContractStatus, Tone> = {
  draft: "new",
  not_sent: "new",
  registered: "work",
  under_review: "work",
  docs_check_required: "work",
  returned_for_revision: "problem",
  awaiting_applicant_signature: "work",
  awaiting_provider_signature: "work",
  inspection_required: "work",
  technical_conditions_required: "work",
  concluded: "done",
  active: "done",
  suspended: "problem",
  terminated: "problem",
  refused: "problem",
};

/** Colour alone is not enough, so the status is always written out. */
export function StatusBadge({ status, label }: { status: ContractStatus; label: string }) {
  return (
    <span className={styles.badge} data-tone={TONES[status]}>
      {label}
    </span>
  );
}
