import { normalizePhone } from "@/features/account/domain/phone";
import { nextYearNumber } from "@/shared/lib/numbering";
import { isText, parseList } from "@/shared/lib/stored-data";

export const FEEDBACK_KEY = "aqmola:feedback";
export const MAX_FEEDBACK = 50;
export const MAX_NAME = 80;
export const MIN_COMMENT = 5;
export const MAX_COMMENT = 1000;

export const feedbackTopics = ["question", "idea", "problem", "other"] as const;
export type FeedbackTopic = (typeof feedbackTopics)[number];

/** "Any questions left?" (as on astana.kz): who asks, how to call back, and the question. */
export type FeedbackForm = {
  name: string;
  phone: string;
  topic: FeedbackTopic;
  comment: string;
  consent: boolean;
};

export type FeedbackErrors = Partial<
  Record<"name" | "phone" | "comment" | "consent", "required" | "format" | "short" | "long">
>;

export type Feedback = {
  id: string;
  number: string;
  name: string;
  phone: string;
  topic: FeedbackTopic;
  comment: string;
  createdAt: string;
};

export const emptyFeedback = (): FeedbackForm => ({
  name: "",
  phone: "",
  topic: "question",
  comment: "",
  consent: false,
});

export function validateFeedback(form: FeedbackForm): FeedbackErrors {
  const errors: FeedbackErrors = {};
  const name = form.name.trim();
  if (!name) errors.name = "required";
  else if (name.length > MAX_NAME) errors.name = "long";
  if (!form.phone.trim()) errors.phone = "required";
  else if (!normalizePhone(form.phone)) errors.phone = "format";
  const comment = form.comment.trim();
  if (!comment) errors.comment = "required";
  else if (comment.length < MIN_COMMENT) errors.comment = "short";
  else if (comment.length > MAX_COMMENT) errors.comment = "long";
  if (!form.consent) errors.consent = "required";
  return errors;
}

export function nextFeedbackNumber(existing: readonly Feedback[], now: Date): string {
  return nextYearNumber(
    "DEMO-FB",
    existing.map((item) => item.number),
    now,
  );
}

/** Builds the message from a form that passed `validateFeedback`. */
export function createFeedback(
  form: FeedbackForm,
  context: { id: string; number: string },
  now: Date,
): Feedback {
  return {
    id: context.id,
    number: context.number,
    name: form.name.trim(),
    phone: normalizePhone(form.phone) ?? form.phone.trim(),
    topic: form.topic,
    comment: form.comment.trim(),
    createdAt: now.toISOString(),
  };
}

function isFeedback(value: unknown): value is Feedback {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    isText(item.id, 60) &&
    isText(item.number, 40) &&
    isText(item.name, MAX_NAME) &&
    isText(item.phone, 20) &&
    (feedbackTopics as readonly unknown[]).includes(item.topic) &&
    isText(item.comment, MAX_COMMENT) &&
    isText(item.createdAt, 40)
  );
}

export function parseFeedback(raw: string | null): Feedback[] {
  return parseList(raw, isFeedback, MAX_FEEDBACK);
}
