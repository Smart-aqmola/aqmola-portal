import type { PaymentStatus } from "../domain/payment";
import { ToneBadge, type Tone } from "@/shared/ui/cabinet/tone-badge";

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

export function PaymentBadge({ status, label }: { status: PaymentStatus; label: string }) {
  return <ToneBadge tone={TONES[status]} label={label} />;
}
