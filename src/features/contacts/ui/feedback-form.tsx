"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createCollection } from "@/shared/lib/collection";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { sameShapeAs, useDraftState } from "@/shared/lib/use-draft-state";
import { Button } from "@/shared/ui/button/button";
import { CheckField, Field } from "@/shared/ui/field/field";
import { useToast } from "@/shared/ui/toast/toast-provider";
import {
  FEEDBACK_KEY,
  MAX_COMMENT,
  MAX_FEEDBACK,
  MAX_NAME,
  createFeedback,
  emptyFeedback,
  feedbackTopics,
  nextFeedbackNumber,
  parseFeedback,
  validateFeedback,
  type Feedback,
  type FeedbackErrors,
  type FeedbackForm as Form,
  type FeedbackTopic,
} from "../domain/feedback";
import styles from "./contacts.module.css";

const messages = createCollection<Feedback>({
  key: FEEDBACK_KEY,
  parse: parseFeedback,
  max: MAX_FEEDBACK,
});

type Labels = Dictionary["contactsPage"]["form"];

/** "Any questions left?": checks the fields, gives a number and keeps the message in the browser. */
export function FeedbackForm({ labels }: { labels: Labels }) {
  const toast = useToast();
  const empty = emptyFeedback();
  const [form, setForm, clearDraft] = useDraftState<Form>("feedback", empty, sameShapeAs(empty));
  const [errors, setErrors] = useState<FeedbackErrors>({});
  const [sent, setSent] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const [attempt, setAttempt] = useState(0);

  // After a failed send the first wrong field gets the focus; after a good one, the confirmation.
  useEffect(() => {
    if (attempt > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [attempt]);
  useEffect(() => {
    if (sent) doneRef.current?.focus();
  }, [sent]);

  const error = (key: keyof FeedbackErrors) => {
    const code = errors[key];
    if (!code) return undefined;
    return key === "consent" ? labels.errors.consent : labels.errors[code];
  };

  function update(patch: Partial<Form>) {
    setForm((current) => ({ ...current, ...patch }));
    setErrors({});
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateFeedback(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setAttempt((value) => value + 1);
      return;
    }
    const now = new Date();
    const number = nextFeedbackNumber(messages.snapshot(), now);
    messages.add(createFeedback(form, { id: crypto.randomUUID(), number }, now));
    clearDraft();
    setSent(number);
    toast.show(`${labels.sentTitle}: ${number}`);
  }

  if (sent) {
    return (
      <div className={styles.done}>
        <h2 className={styles.formTitle} tabIndex={-1} ref={doneRef}>
          {labels.sentTitle}
        </h2>
        <p>{format(labels.sentText, { number: sent })}</p>
        <div>
          <Button variant="light" onClick={() => setSent(undefined)}>
            {labels.again}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} className={styles.form} noValidate onSubmit={submit}>
      <h2 className={styles.formTitle}>{labels.title}</h2>
      <p className={styles.note}>{labels.lead}</p>
      <Field label={labels.name} error={error("name")} required>
        {(control) => (
          <input
            {...control}
            value={form.name}
            maxLength={MAX_NAME + 10}
            autoComplete="given-name"
            onChange={(event) => update({ name: event.target.value })}
          />
        )}
      </Field>
      <Field label={labels.phone} hint={labels.phoneHint} error={error("phone")} required>
        {(control) => (
          <input
            {...control}
            type="tel"
            value={form.phone}
            autoComplete="tel"
            onChange={(event) => update({ phone: event.target.value })}
          />
        )}
      </Field>
      <Field label={labels.topic}>
        {(control) => (
          <select
            {...control}
            value={form.topic}
            onChange={(event) => update({ topic: event.target.value as FeedbackTopic })}
          >
            {feedbackTopics.map((topic) => (
              <option key={topic} value={topic}>
                {labels.topics[topic]}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={labels.comment} hint={labels.commentHint} error={error("comment")} required>
        {(control) => (
          <textarea
            {...control}
            rows={4}
            value={form.comment}
            maxLength={MAX_COMMENT + 50}
            onChange={(event) => update({ comment: event.target.value })}
          />
        )}
      </Field>
      <CheckField
        label={labels.consent}
        checked={form.consent}
        error={error("consent")}
        onChange={(consent) => update({ consent })}
      />
      <div>
        <Button type="submit">{labels.submit}</Button>
      </div>
    </form>
  );
}
