"use client";

import { useState } from "react";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { useAudit } from "@/features/organization/ui/use-audit";
import { MAX_COMMENT, changeStatus, type Application } from "../domain/application";
import { allowedNextStatuses } from "../domain/status";
import { useApplications } from "./use-applications";
import { useSession } from "./use-session";
import panel from "./panel.module.css";

type Props = {
  application: Application;
  labels: Dictionary["operator"]["change"];
};

/** Buttons for the statuses the rules allow next, with an optional note for the applicant. */
export function StatusForm({ application, labels }: Props) {
  const { replace } = useApplications();
  const { session } = useSession();
  const { log } = useAudit();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const next = allowedNextStatuses(application.status);

  if (next.length === 0) {
    return <p className={panel.hint}>{labels.finalNote}</p>;
  }

  const trimmed = note.trim();
  const tooLong = trimmed.length > MAX_COMMENT;

  function apply(to: (typeof next)[number]) {
    if (tooLong) return;
    // The version is what is on screen now: if it changed meanwhile, the change is refused.
    const result = changeStatus(
      application,
      to,
      new Date(),
      trimmed || undefined,
      application.version,
    );
    if (!result.ok) {
      setMessage({
        kind: "error",
        text: result.reason === "stale" ? labels.stale : labels.forbidden,
      });
      return;
    }
    replace(result.application);
    log({
      organizationId: application.organizationId,
      actor: session?.name ?? "",
      entity: "service_application",
      entityId: application.number,
      number: application.number,
      action: "status",
      from: application.status,
      to,
      note: trimmed || undefined,
    });
    setNote("");
    setMessage({ kind: "ok", text: labels.changed });
  }

  return (
    <section className={panel.card}>
      <h3 className={panel.heading}>{labels.title}</h3>
      <label className={panel.field}>
        {labels.note}
        <textarea
          className={panel.input}
          rows={2}
          value={note}
          aria-invalid={tooLong}
          onChange={(event) => setNote(event.target.value)}
        />
        <span className={panel.hint}>{format(labels.noteHint, { max: MAX_COMMENT })}</span>
      </label>
      <div className={panel.row}>
        {next.map((status) => (
          <Button
            key={status}
            variant={status === "rejected" ? "light" : "primary"}
            disabled={tooLong}
            onClick={() => apply(status)}
          >
            {labels.to[status]}
          </Button>
        ))}
      </div>
      {message && (
        <p
          className={message.kind === "error" ? panel.error : panel.hint}
          role={message.kind === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
