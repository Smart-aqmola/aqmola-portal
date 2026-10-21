import type { PaymentStatus } from "../domain/payment";
import styles from "./billing.module.css";

type Tone = "new" | "work" | "done" | "problem";

const TONES: Record<PaymentStatus, Tone> = {
  awaiting_payment: "new",
  initiated: "work",
  processing: "work",
  paid: "done",
  declined: "problem",
  cancelled: "problem",
  refunded: "problem",
  awaiting_confirmation: "work",
};

/** Colour alone is not enough, so the status is always written out. */
export function PaymentBadge({ status, label }: { status: PaymentStatus; label: string }) {
  return (
    <span className={styles.badge} data-tone={TONES[status]}>
      {label}
    </span>
  );
}
