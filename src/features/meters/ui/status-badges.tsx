import type { RequestStatus } from "../domain/meter-request";
import type { ReadingStatus } from "../domain/reading";
import { ToneBadge, type Tone } from "@/shared/ui/cabinet/tone-badge";

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

export const REQUEST_TONES: Record<RequestStatus, Tone> = {
  registered: "new",
  in_progress: "work",
  info_requested: "problem",
  scheduled: "work",
  done: "done",
  rejected: "problem",
};

export function ReadingBadge({ status, label }: { status: ReadingStatus; label: string }) {
  return <ToneBadge tone={READING_TONES[status]} label={label} />;
}

export function RequestBadge({ status, label }: { status: RequestStatus; label: string }) {
  return <ToneBadge tone={REQUEST_TONES[status]} label={label} />;
}
