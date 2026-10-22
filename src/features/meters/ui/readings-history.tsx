"use client";

import { ShowMoreList } from "@/shared/ui/show-more/show-more";
import { useState } from "react";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { useToast } from "@/shared/ui/toast/toast-provider";
import type { Meter } from "../domain/meter";
import {
  readingProviderChange,
  readingProviderOptions,
  readingStage,
  type Reading,
  type ReadingStatus,
} from "../domain/reading";
import { MetersArea, type MetersContext, type MetersDict } from "./meters-area";
import { day, fileSize, meterLabel, readingText, stamp } from "./meter-texts";
import { ReadingBadge } from "./status-badges";
import styles from "./meters.module.css";

type ReadingsHistoryProps = {
  lang: Locale;
  dict: MetersDict;
  territories: { id: string; name: string }[];
};

/** The part "History of readings" (spec 7.13): date, value, photo, status, check result, provider's note. */
export function ReadingsHistory(props: ReadingsHistoryProps) {
  const { lang, dict, territories } = props;
  return (
    <MetersArea
      lang={lang}
      dict={dict}
      territories={territories}
      current="history"
      here={`/${lang}/meters/history`}
    >
      {(context) => <List {...props} context={context} />}
    </MetersArea>
  );
}

function List({ lang, dict, context }: ReadingsHistoryProps & { context: MetersContext }) {
  const { data } = context;
  const t = dict.meters.readings;
  const [propertyFilter, setPropertyFilter] = useState("");
  const [meterFilter, setMeterFilter] = useState("");

  const metersById = new Map(data.meters.map((item) => [item.id, item]));
  const withReadings = data.meters.filter((item) =>
    data.readings.some((reading) => reading.meterId === item.id),
  );
  const objects = [...new Map(withReadings.map((item) => [item.propertyId, item.address]))];
  const shown = [...data.readings]
    .filter(
      (item) =>
        (!propertyFilter || item.propertyId === propertyFilter) &&
        (!meterFilter || item.meterId === meterFilter),
    )
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  if (data.readings.length === 0) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{t.empty.title}</h2>
        <p>{t.empty.text}</p>
        <div>
          <Button href={`/${lang}/meters/submit`}>{t.empty.button}</Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <div>
        <h2 className={styles.heading}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>
      <div className={styles.listTools}>
        <Field label={t.filterProperty}>
          {(control) => (
            <select
              {...control}
              value={propertyFilter}
              onChange={(event) => {
                setPropertyFilter(event.target.value);
                setMeterFilter("");
              }}
            >
              <option value="">{t.all}</option>
              {objects.map(([id, address]) => (
                <option key={id} value={id}>
                  {address}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t.filterMeter}>
          {(control) => (
            <select
              {...control}
              value={meterFilter}
              onChange={(event) => setMeterFilter(event.target.value)}
            >
              <option value="">{t.all}</option>
              {withReadings
                .filter((item) => !propertyFilter || item.propertyId === propertyFilter)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {meterLabel(item, dict)}
                  </option>
                ))}
            </select>
          )}
        </Field>
      </div>
      <p className={styles.note} aria-live="polite">
        {format(t.count, { n: shown.length })}
      </p>
      <ShowMoreList items={shown} labels={dict.list}>
        {(visible) => (
          <ul className={styles.items}>
            {visible.map((reading) => (
              <li key={reading.id}>
                <ReadingCard
                  lang={lang}
                  dict={dict}
                  reading={reading}
                  meter={metersById.get(reading.meterId)}
                  onChange={data.replaceReading}
                />
              </li>
            ))}
          </ul>
        )}
      </ShowMoreList>
    </>
  );
}

function ReadingCard({
  lang,
  dict,
  reading,
  meter,
  onChange,
}: {
  lang: Locale;
  dict: MetersDict;
  reading: Reading;
  meter: Meter | undefined;
  onChange: (reading: Reading) => void;
}) {
  const t = dict.meters.readings;
  const f = t.fields;
  const decimals = meter?.decimals ?? 3;
  const title = meter ? meterLabel(meter, dict) : reading.number;

  return (
    <article className={styles.item} aria-label={`${title}, ${reading.number}`}>
      <div className={styles.detailHead}>
        <h3 className={styles.itemTitle}>{title}</h3>
        <ReadingBadge status={reading.status} label={dict.meters.status[reading.status]} />
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>{f.number}</dt>
          <dd>{reading.number}</dd>
        </div>
        <div>
          <dt>{f.date}</dt>
          <dd>{day(reading.readingDate, lang, "")}</dd>
        </div>
        <div>
          <dt>{f.value}</dt>
          <dd>{readingText(reading.value, decimals)}</dd>
        </div>
        <div>
          <dt>{f.previous}</dt>
          <dd>{readingText(reading.previousValue, decimals)}</dd>
        </div>
        <div>
          <dt>{f.sent}</dt>
          <dd>{stamp(reading.submittedAt, lang)}</dd>
        </div>
        <div>
          <dt>{f.photo}</dt>
          <dd>
            {reading.photo
              ? `${reading.photo.name}, ${fileSize(reading.photo.size, dict.contracts.documents)}`
              : t.noPhoto}
          </dd>
        </div>
        <div>
          <dt>{f.stage}</dt>
          <dd>{dict.meters.stage[readingStage(reading.status)]}</dd>
        </div>
        <div>
          <dt>{f.comment}</dt>
          <dd>{reading.providerNote ?? t.noComment}</dd>
        </div>
      </dl>

      <details className={styles.details}>
        <summary>{t.steps}</summary>
        <ul className={styles.timeline}>
          {reading.history.map((entry, index) => (
            <li key={`${entry.status}-${index}`}>
              <span>{stamp(entry.at, lang)}</span>
              <span>
                {dict.meters.status[entry.status]}
                {entry.note ? `: ${entry.note}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </details>

      <ReadingProviderPanel dict={dict} reading={reading} onChange={onChange} />
    </article>
  );
}

/** Plays the provider so the whole path of a reading can be seen. There is nothing like it in the real portal. */
export function ReadingProviderPanel({
  dict,
  reading,
  onChange,
  onDone,
}: {
  dict: MetersDict;
  reading: Reading;
  onChange: (reading: Reading) => void;
  /** Told after a step was made, for the audit log of the organization (spec 12.7). */
  onDone?: (step: { from: ReadingStatus; to: ReadingStatus; note?: string }) => void;
}) {
  const t = dict.meters.readings.provider;
  const toast = useToast();
  const options = readingProviderOptions(reading.status);
  const [action, setAction] = useState<ReadingStatus | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();

  if (options.length === 0) return null;
  const needsNote = action === "rejected" || action === "clarification_required";

  function choose(value: string) {
    const next = value as ReadingStatus | "";
    setAction(next);
    setError(undefined);
    setNote(next === "rejected" || next === "clarification_required" ? t.notes[next] : "");
  }

  function apply() {
    if (!action) return;
    const result = readingProviderChange(reading, action, new Date(), note);
    if (!result.ok) {
      setError(t.noteRequired);
      return;
    }
    onChange(result.reading);
    onDone?.({ from: reading.status, to: action, note: note.trim() || undefined });
    setAction("");
    setNote("");
    toast.show(t.done);
  }

  return (
    <details className={`${styles.demo} ${styles.details}`}>
      <summary>{t.title}</summary>
      <p>{t.hint}</p>
      <Field label={t.action}>
        {(control) => (
          <select {...control} value={action} onChange={(event) => choose(event.target.value)}>
            <option value="">{t.choose}</option>
            {options.map((item) => (
              <option key={item} value={item}>
                {t.actions[item as keyof typeof t.actions]}
              </option>
            ))}
          </select>
        )}
      </Field>
      {needsNote && (
        <Field label={t.note} error={error} required>
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
      <div>
        <Button variant="light" onClick={apply}>
          {t.apply}
        </Button>
      </div>
    </details>
  );
}
