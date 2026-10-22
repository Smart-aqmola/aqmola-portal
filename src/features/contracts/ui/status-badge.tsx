import type { ContractStatus } from "../domain/contract";
import { ToneBadge, type Tone } from "@/shared/ui/cabinet/tone-badge";

export const CONTRACT_TONES: Record<ContractStatus, Tone> = {
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

export function StatusBadge({ status, label }: { status: ContractStatus; label: string }) {
  return <ToneBadge tone={CONTRACT_TONES[status]} label={label} />;
}
