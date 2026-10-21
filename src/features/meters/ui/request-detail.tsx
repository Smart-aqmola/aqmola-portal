"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/shared/i18n/config";
import { downloadText } from "@/shared/lib/download-text";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { useToast } from "@/shared/ui/toast/toast-provider";
import {
  completeRequest,
  isRequestFinal,
  requestForms,
  requestProviderChange,
  requestProviderOptions,
  timeSlots,
  type MeterRequest,
  type ProviderStep,
  type RequestResult,
  type RequestStatus,
} from "../domain/meter-request";
import type { Meter } from "../domain/meter";
import { MetersArea, type MetersContext, type MetersDict } from "./meters-area";
import { actText, day, fileSize, meterLabel, stamp } from "./meter-texts";
import { slotText } from "./requests-list";
import { RequestBadge } from "./status-badges";
import styles from "./meters.module.css";

type RequestDetailProps = {
  lang: Locale;
  dict: MetersDict;
  territories: { id: string; name: string }[];
  id: string;
};

/** The page of one request for work on a meter: data, history, result, act (spec 8.9, 8.10). */
export function RequestDetail(props: RequestDetailProps) {
  const { lang, dict, territories, id } = props;
  return (
    <MetersArea
      lang={lang}
      dict={dict}
      territories={territories}
      current="requests"
      here={`/${lang}/meters/requests/${id}`}
    >
      {(context) => <Loaded {...props} context={context} />}
    </MetersArea>
  );
}

function Loaded({ lang, dict, id, context }: RequestDetailProps & { context: MetersContext }) {
  const { data } = context;
  const t = dict.meters.requestDetail;
  const request = data.requests.find((item) => item.id === id);

  if (!request) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{t.notFound.title}</h2>
        <p>{t.notFound.text}</p>
        <div>
          <Button href={`/${lang}/meters/requests`}>{t.notFound.button}</Button>
        </div>
      </section>
    );
  }
  return <Detail lang={lang} dict={dict} request={request} context={context} />;
}

function Detail({
  lang,
  dict,
  request,
  context,
}: {
  lang: Locale;
  dict: MetersDict;
  request: MeterRequest;
  context: MetersContext;
}) {
  const { data } = context;
  const t = dict.meters.requestDetail;
  const f = t.fields;
  const none = t.none;
  const meter = data.meters.find((item) => item.id === request.meterId);
  const title = dict.meters.nav[request.kind];
  const result = request.result;

  return (
    <>
      <Link href={`/${lang}/meters/requests`} className={styles.back}>
        {t.back}
      </Link>
      <section className={styles.card} aria-labelledby="request-head">
        <div className={styles.detailHead}>
          <h2 id="request-head" className={styles.heading}>
            {title}
          </h2>
          <RequestBadge status={request.status} label={dict.meters.requestStatus[request.status]} />
        </div>
        <p>{dict.meters.requestHints[request.status]}</p>
        {request.remarks && (
          <p>
            <strong>{f.remarks}:</strong> {request.remarks}
          </p>
        )}

        <h3 className={styles.boxTitle}>{t.sections.data}</h3>
        <dl className={styles.facts}>
          <div>
            <dt>{dict.meters.requests.fields.number}</dt>
            <dd>{request.number}</dd>
          </div>
          <div>
            <dt>{dict.meters.requests.fields.object}</dt>
            <dd>{request.address}</dd>
          </div>
          <div>
            <dt>{dict.meters.common.service}</dt>
            <dd>{dict.meters.resources[request.resource]}</dd>
          </div>
          <div>
            <dt>{dict.meters.requests.fields.meter}</dt>
            <dd>{meter ? meterLabel(meter, dict) : dict.meters.requests.noMeter}</dd>
          </div>
          <div>
            <dt>{f.reason}</dt>
            <dd>
              {dict.meters.request.reasons[
                request.reason as keyof typeof dict.meters.request.reasons
              ] ?? request.reason}
            </dd>
          </div>
          {Object.entries(request.details).map(([key, value]) => (
            <div key={key}>
              <dt>
                {dict.meters.request.details[key as keyof typeof dict.meters.request.details]}
              </dt>
              <dd>{/^\d{4}-\d{2}-\d{2}$/.test(value) ? day(value, lang, none) : value}</dd>
            </div>
          ))}
          {request.currentReading && (
            <div>
              <dt>{f.reading}</dt>
              <dd>{request.currentReading}</dd>
            </div>
          )}
          <div>
            <dt>{f.phone}</dt>
            <dd>{request.contactPhone}</dd>
          </div>
          <div>
            <dt>{f.slots}</dt>
            <dd>
              <ul className={styles.slotList}>
                {request.slots.map((slot) => (
                  <li key={`${slot.date}-${slot.time}`}>{slotText(slot, lang, dict)}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>{f.comment}</dt>
            <dd>{request.comment || none}</dd>
          </div>
          <div>
            <dt>{f.files}</dt>
            <dd>
              {request.attachments.length === 0
                ? none
                : request.attachments
                    .map((file) => `${file.name}, ${fileSize(file.size, dict.contracts.documents)}`)
                    .join("; ")}
            </dd>
          </div>
          <div>
            <dt>{f.scheduled}</dt>
            <dd>{request.scheduled ? slotText(request.scheduled, lang, dict) : none}</dd>
          </div>
          <div>
            <dt>{f.assignee}</dt>
            <dd>{request.assignee ?? none}</dd>
          </div>
        </dl>

        {result && (
          <>
            <h3 className={styles.boxTitle}>{t.sections.result}</h3>
            <dl className={styles.facts}>
              <div>
                <dt>{t.result.date}</dt>
                <dd>{day(result.at, lang, none)}</dd>
              </div>
              {result.newSerial && (
                <div>
                  <dt>{t.result.newSerial}</dt>
                  <dd>{result.newSerial}</dd>
                </div>
              )}
              {result.reading && (
                <div>
                  <dt>{t.result.reading}</dt>
                  <dd>{result.reading}</dd>
                </div>
              )}
              {result.seal && (
                <div>
                  <dt>{t.result.seal}</dt>
                  <dd>{result.seal}</dd>
                </div>
              )}
              {result.nextVerification && (
                <div>
                  <dt>{t.result.nextVerification}</dt>
                  <dd>{day(result.nextVerification, lang, none)}</dd>
                </div>
              )}
            </dl>
          </>
        )}

        <h3 className={styles.boxTitle}>{t.sections.act}</h3>
        {request.status === "done" ? (
          <>
            <p className={styles.note}>{t.act.text}</p>
            <div>
              <Button
                variant="light"
                onClick={() =>
                  downloadText(`${request.number}.txt`, actText(request, meter, dict, lang))
                }
              >
                {t.act.download}
              </Button>
            </div>
          </>
        ) : (
          <p className={styles.note}>{t.act.notYet}</p>
        )}

        <h3 className={styles.boxTitle}>{t.sections.history}</h3>
        <ul className={styles.timeline}>
          {request.history.map((entry, index) => (
            <li key={`${entry.status}-${index}`}>
              <span>{stamp(entry.at, lang)}</span>
              <RequestBadge status={entry.status} label={dict.meters.requestStatus[entry.status]} />
              {entry.note && <span>{entry.note}</span>}
            </li>
          ))}
        </ul>
      </section>

      <RequestProviderPanel
        dict={dict}
        request={request}
        meters={data.meters}
        onRequest={data.replaceRequest}
        onMeters={data.saveMeters}
      />
    </>
  );
}

type PanelAction = RequestStatus | "";

/** Plays the provider (the executor) so the whole path of a request can be seen (spec 8.8). */
export function RequestProviderPanel({
  dict,
  request,
  meters,
  onRequest,
  onMeters,
  onDone,
}: {
  dict: MetersDict;
  request: MeterRequest;
  /** The meters of the person, to change when the work is done (spec 8.11). */
  meters: readonly Meter[];
  onRequest: (request: MeterRequest) => void;
  onMeters: (changes: { updated: Meter[]; created: Meter[] }) => void;
  /** Told after a step was made, for the audit log of the organization (spec 12.7). */
  onDone?: (step: { from: RequestStatus; to: RequestStatus; note?: string }) => void;
}) {
  const t = dict.meters.requestDetail.provider;
  const toast = useToast();
  const form = requestForms[request.kind];
  const [action, setAction] = useState<PanelAction>("");
  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState("");
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState<(typeof timeSlots)[number]>("morning");
  const [workDate, setWorkDate] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();

  if (isRequestFinal(request.status)) {
    return (
      <section className={styles.demo}>
        <strong>{t.title}</strong>
        <p>{t.final}</p>
      </section>
    );
  }

  const options = requestProviderOptions(request.status);
  const rescheduling = request.status === "scheduled" && action === "scheduled";

  function choose(value: string) {
    const next = value as PanelAction;
    const today = new Date().toISOString().slice(0, 10);
    const tail = request.number.slice(-5);
    setAction(next);
    setError(undefined);
    setNote(
      next === "info_requested" || next === "rejected"
        ? t.noteDefaults[next]
        : next === "scheduled" && request.status === "scheduled"
          ? t.noteDefaults.rescheduled
          : "",
    );
    if (next === "scheduled") {
      const first = request.scheduled ?? request.slots[0];
      setSlotDate(first?.date ?? "");
      setSlotTime(first?.time ?? "morning");
      setAssignee(request.assignee ?? t.assigneeDefault);
    }
    if (next === "done") {
      setWorkDate(today);
      setFields({
        newSerial: `N-${tail}`,
        reading: "0",
        seal: `P-${tail}`,
        nextVerification: `${Number(today.slice(0, 4)) + 6}${today.slice(4)}`,
      });
    }
  }

  function apply() {
    if (!action) return;
    const step: ProviderStep = { note };
    if (action === "scheduled") {
      step.slot = { date: slotDate, time: slotTime };
      step.assignee = assignee;
    }
    if (action === "done") {
      const result: RequestResult = { at: workDate };
      for (const key of form.result) {
        const value = fields[key]?.trim();
        if (value) result[key] = value;
      }
      step.result = result;
    }
    const now = new Date();
    const changed = requestProviderChange(request, action, now, step);
    if (!changed.ok) {
      setError(
        changed.reason === "note_required"
          ? t.noteRequired
          : changed.reason === "slot_required"
            ? t.slotRequired
            : t.resultRequired,
      );
      return;
    }
    onRequest(changed.request);
    if (action === "done") {
      onMeters(completeRequest(changed.request, meters, crypto.randomUUID(), now));
    }
    onDone?.({ from: request.status, to: action, note: step.note?.trim() || undefined });
    setAction("");
    setNote("");
    toast.show(t.applied);
  }

  const showNote = action === "info_requested" || action === "rejected" || rescheduling;

  return (
    <section className={styles.demo} aria-labelledby="provider-panel">
      <strong id="provider-panel">{t.title}</strong>
      <p>{t.hint}</p>
      <Field label={t.action}>
        {(control) => (
          <select {...control} value={action} onChange={(event) => choose(event.target.value)}>
            <option value="">{t.choose}</option>
            {options.map((item) => (
              <option key={item} value={item}>
                {item === "scheduled" && request.status === "scheduled"
                  ? t.actions.rescheduled
                  : t.actions[item as keyof typeof t.actions]}
              </option>
            ))}
          </select>
        )}
      </Field>

      {action === "scheduled" && (
        <>
          <div className={styles.slot}>
            <Field label={t.slotDate} required>
              {(control) => (
                <input
                  {...control}
                  type="date"
                  value={slotDate}
                  onChange={(event) => setSlotDate(event.target.value)}
                />
              )}
            </Field>
            <Field label={t.slotTime}>
              {(control) => (
                <select
                  {...control}
                  value={slotTime}
                  onChange={(event) => setSlotTime(event.target.value as typeof slotTime)}
                >
                  {timeSlots.map((time) => (
                    <option key={time} value={time}>
                      {dict.meters.request.times[time]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <Field label={t.assignee} required>
            {(control) => (
              <input
                {...control}
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
              />
            )}
          </Field>
        </>
      )}

      {action === "done" && (
        <>
          <Field label={dict.meters.requestDetail.result.date} required>
            {(control) => (
              <input
                {...control}
                type="date"
                value={workDate}
                onChange={(event) => setWorkDate(event.target.value)}
              />
            )}
          </Field>
          {form.result.map((key) => (
            <Field
              key={key}
              label={dict.meters.requestDetail.result[key]}
              required={(form.mustFill as readonly string[]).includes(key)}
            >
              {(control) => (
                <input
                  {...control}
                  type={key === "nextVerification" ? "date" : "text"}
                  value={fields[key] ?? ""}
                  onChange={(event) => setFields({ ...fields, [key]: event.target.value })}
                />
              )}
            </Field>
          ))}
        </>
      )}

      {showNote && (
        <Field label={t.note} required>
          {(control) => (
            <textarea
              {...control}
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          )}
        </Field>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div>
        <Button variant="light" onClick={apply}>
          {t.apply}
        </Button>
      </div>
    </section>
  );
}
