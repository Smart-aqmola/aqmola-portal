import type { AppealStatus } from "../domain/appeal";
import { ToneBadge, type Tone } from "@/shared/ui/cabinet/tone-badge";

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

export function AppealBadge({ status, label }: { status: AppealStatus; label: string }) {
  return <ToneBadge tone={APPEAL_TONES[status]} label={label} />;
}
