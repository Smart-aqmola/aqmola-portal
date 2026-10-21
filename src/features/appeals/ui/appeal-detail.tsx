"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { useToast } from "@/shared/ui/toast/toast-provider";
import { sizeParts } from "@/shared/lib/upload-rules";
import {
  MAX_MESSAGE,
  NEEDS_TEXT,
  REGION_OFFICE,
  applicantClose,
  applicantMessage,
  awaitsApplicant,
  executorOptions,
  executorStep,
  isClosedAppeal,
  lastExecutorText,
  type Appeal,
  type AppealStatus,
} from "../domain/appeal";
import { AppealBadge } from "./appeal-badge";
import { AppealsArea, type AppealsAreaProps, type AppealsContext } from "./appeals-area";
import styles from "./appeals.module.css";

type AppealDetailProps = AppealsAreaProps & { id: string };

/** The page of one appeal: data, the answer, the history of dealings, a reply (spec 11.5–11.8). */
export function AppealDetail(props: AppealDetailProps) {
  const { lang, id } = props;
  return (
    <AppealsArea {...props} here={`/${lang}/appeals/${id}`}>
      {(context) => <Loaded {...props} context={context} />}
    </AppealsArea>
  );
}

function Loaded({ lang, dict, id, context }: AppealDetailProps & { context: AppealsContext }) {
  const t = dict.appeals.detail;
  const appeal = context.appeals.mine.find((item) => item.id === id);
  if (!appeal) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{t.notFound.title}</h2>
        <p>{t.notFound.text}</p>
        <div>
          <Button href={`/${lang}/appeals`}>{t.notFound.button}</Button>
        </div>
      </section>
    );
  }
  return <Detail lang={lang} dict={dict} appeal={appeal} context={context} />;
}

/** "21 октября 2026, 06:00 UTC": the day never shifts with the visitor's time zone. */
const stamp = (iso: string, lang: Locale) =>
  `${formatDate(iso.slice(0, 10), lang)} ${iso.slice(0, 4)}, ${iso.slice(11, 16)} UTC`;

function Detail({
  lang,
  dict,
  appeal,
  context,
}: {
  lang: Locale;
  dict: AppealsAreaProps["dict"];
  appeal: Appeal;
  context: AppealsContext;
}) {
  const t = dict.appeals.detail;
  const f = t.fields;
  const toast = useToast();
  const { appeals } = context;
  const answer = lastExecutorText(appeal);
  const closed = isClosedAppeal(appeal.status);
  const refused = appeal.status === "refused";
  const category = dict.appeals.categories[appeal.category];
  const subLabels = dict.appeals.subcategories[appeal.category] as Record<string, string>;

  function close() {
    const result = applicantClose(appeal, new Date());
    if (!result.ok) return;
    appeals.replace(result.appeal);
    toast.show(t.close.done);
  }

  const v = appeal.violation;
  const violation = v
    ? format(t.violation, {
        date: v.date,
        time: v.time ? `, ${v.time}` : "",
        duration: v.duration ? `, ${v.duration} ${t.units[v.unit]}` : "",
      })
    : undefined;

  return (
    <>
      <Link href={`/${lang}/appeals`} className={styles.back}>
        {t.back}
      </Link>
      <section className={styles.card} aria-labelledby="appeal-head">
        <div className={styles.detailHead}>
          <h2 id="appeal-head" className={styles.heading}>
            {category}
          </h2>
          <AppealBadge status={appeal.status} label={dict.appeals.status[appeal.status]} />
        </div>
        <p>{dict.appeals.statusHint[appeal.status]}</p>

        {answer &&
          (appeal.status === "answer_ready" || closed || appeal.status === "redirected") && (
            <div className={`${styles.box} ${refused ? styles.warn : ""}`}>
              <h3 className={styles.boxTitle}>{refused ? t.sections.reason : t.sections.answer}</h3>
              <p>{answer}</p>
            </div>
          )}

        {appeal.status === "answer_ready" || appeal.status === "executed" ? (
          <div className={styles.box}>
            <p>{t.close.text}</p>
            <div>
              <Button onClick={close}>{t.close.button}</Button>
            </div>
          </div>
        ) : null}

        <h3 className={styles.boxTitle}>{t.sections.data}</h3>
        <dl className={styles.facts}>
          <div>
            <dt>{f.number}</dt>
            <dd>{appeal.number}</dd>
          </div>
          <div>
            <dt>{f.category}</dt>
            <dd>
              {category}: {subLabels[appeal.subcategory]}
            </dd>
          </div>
          {appeal.sector && (
            <div>
              <dt>{f.sector}</dt>
              <dd>{dict.appeals.sectors[appeal.sector]}</dd>
            </div>
          )}
          <div>
            <dt>{f.object}</dt>
            <dd>{appeal.address}</dd>
          </div>
          <div>
            <dt>{f.organization}</dt>
            <dd>{appeal.organizationName}</dd>
          </div>
          <div>
            <dt>{f.description}</dt>
            <dd>{appeal.description}</dd>
          </div>
          {violation && (
            <div>
              <dt>{f.violation}</dt>
              <dd>{violation}</dd>
            </div>
          )}
          <div>
            <dt>{f.contact}</dt>
            <dd>{[appeal.contactPhone, appeal.contactEmail].filter(Boolean).join(", ")}</dd>
          </div>
          <div>
            <dt>{f.created}</dt>
            <dd>{stamp(appeal.createdAt, lang)}</dd>
          </div>
          <div>
            <dt>{f.files}</dt>
            <dd>
              {appeal.attachments.length === 0
                ? t.none
                : appeal.attachments
                    .map((file) => {
                      const size = sizeParts(file.size);
                      return `${file.name}, ${size.value} ${
                        size.unit === "mb"
                          ? dict.contracts.documents.mb
                          : dict.contracts.documents.kb
                      }`;
                    })
                    .join("; ")}
            </dd>
          </div>
        </dl>

        {appeal.external && (
          <div className={styles.demo}>
            <strong>{t.sections.external}</strong>
            <p>{format(t.external, { number: appeal.external.number })}</p>
          </div>
        )}

        <h3 className={styles.boxTitle}>{t.sections.thread}</h3>
        <ul className={styles.timeline}>
          {appeal.events.map((event, index) => (
            <li key={`${event.at}-${index}`}>
              <span>{stamp(event.at, lang)}</span>
              <strong>{event.actor === "applicant" ? t.thread.you : t.thread.executor}</strong>
              {event.status && (
                <AppealBadge status={event.status} label={dict.appeals.status[event.status]} />
              )}
              {event.text && <span>{event.text}</span>}
            </li>
          ))}
        </ul>

        {!closed && <Reply dict={dict} appeal={appeal} onChange={appeals.replace} />}
      </section>

      <ExecutorPanel dict={dict} appeal={appeal} onChange={appeals.replace} />
    </>
  );
}

/** The person writes to the organization; an answer to a question puts the appeal back to review. */
function Reply({
  dict,
  appeal,
  onChange,
}: {
  dict: AppealsAreaProps["dict"];
  appeal: Appeal;
  onChange: (appeal: Appeal) => void;
}) {
  const t = dict.appeals.detail.reply;
  const toast = useToast();
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();

  function send() {
    const result = applicantMessage(appeal, text, new Date());
    if (!result.ok) {
      setError(t.required);
      return;
    }
    onChange(result.appeal);
    setText("");
    setError(undefined);
    toast.show(t.sent);
  }

  return (
    <div className={styles.box}>
      <h3 className={styles.boxTitle}>{t.title}</h3>
      {awaitsApplicant(appeal) && <p>{t.question}</p>}
      <Field label={t.label} hint={format(t.long, { max: MAX_MESSAGE })} error={error} required>
        {(control) => (
          <textarea
            {...control}
            rows={3}
            maxLength={MAX_MESSAGE}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        )}
      </Field>
      <div>
        <Button onClick={send}>{t.send}</Button>
      </div>
    </div>
  );
}

/** Plays the organization so the whole path of an appeal can be seen (spec 11.7). */
function ExecutorPanel({
  dict,
  appeal,
  onChange,
}: {
  dict: AppealsAreaProps["dict"];
  appeal: Appeal;
  onChange: (appeal: Appeal) => void;
}) {
  const t = dict.appeals.detail.provider;
  const toast = useToast();
  const [action, setAction] = useState<AppealStatus | "">("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const options = executorOptions(appeal.status);

  if (options.length === 0) {
    return (
      <section className={styles.demo}>
        <strong>{t.title}</strong>
        <p>{t.final}</p>
      </section>
    );
  }

  const needsText = action !== "" && NEEDS_TEXT.includes(action);
  const redirecting = action === "redirected";
  const target = { id: REGION_OFFICE.id, name: dict.appeals.regionOffice };

  function choose(value: string) {
    const next = value as AppealStatus | "";
    setAction(next);
    setError(undefined);
    setText(next && next in t.defaults ? t.defaults[next as keyof typeof t.defaults] : "");
  }

  function apply() {
    if (!action) return;
    const result = executorStep(appeal, action, text, new Date(), redirecting ? target : undefined);
    if (!result.ok) {
      setError(t.textRequired);
      return;
    }
    onChange(result.appeal);
    setAction("");
    setText("");
    toast.show(t.applied);
  }

  return (
    <section className={styles.demo} aria-labelledby="executor-panel">
      <strong id="executor-panel">{t.title}</strong>
      <p>{t.hint}</p>
      <Field label={t.action}>
        {(control) => (
          <select {...control} value={action} onChange={(event) => choose(event.target.value)}>
            <option value="">{t.choose}</option>
            {options.map((item) => (
              <option key={item} value={item}>
                {item === "in_review" && appeal.status === "answer_ready"
                  ? t.actions.in_review
                  : t.actions[item as keyof typeof t.actions]}
              </option>
            ))}
          </select>
        )}
      </Field>
      {redirecting && <p>{format(t.redirect, { name: target.name })}</p>}
      {needsText && (
        <Field label={t.text} error={error} required>
          {(control) => (
            <textarea
              {...control}
              rows={3}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          )}
        </Field>
      )}
      <div>
        <Button variant="light" onClick={apply}>
          {t.apply}
        </Button>
      </div>
    </section>
  );
}
