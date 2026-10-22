"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { Button } from "@/shared/ui/button/button";
import { isActive, type Meter } from "../domain/meter";
import { newestReading, previousOf, type Reading } from "../domain/reading";
import { MeterForm } from "./meter-form";
import { MetersArea, type MetersContext, type MetersDict } from "./meters-area";
import { day, readingText } from "./meter-texts";
import { ReadingBadge } from "./status-badges";
import styles from "@/shared/ui/cabinet/cabinet.module.css";

type MyMetersProps = {
  lang: Locale;
  dict: MetersDict;
  territories: { id: string; name: string }[];
  /** The object the person came from, if any. */
  propertyId?: string;
};

/** The part "My meters": every meter of the person by object, with the card of spec 6.3. */
export function MyMeters(props: MyMetersProps) {
  const { lang, dict, territories } = props;
  return (
    <MetersArea
      lang={lang}
      dict={dict}
      territories={territories}
      current="my"
      here={`/${lang}/meters`}
    >
      {(context) => <List {...props} context={context} />}
    </MetersArea>
  );
}

function groupByObject(items: readonly Meter[]) {
  const groups = new Map<string, { address: string; items: Meter[] }>();
  for (const item of items) {
    const group = groups.get(item.propertyId) ?? { address: item.address, items: [] };
    group.items.push(item);
    groups.set(item.propertyId, group);
  }
  return [...groups.entries()].map(([propertyId, group]) => ({ propertyId, ...group }));
}

function List({ lang, dict, propertyId, context }: MyMetersProps & { context: MetersContext }) {
  const { ownerId, properties, labelOf, data } = context;
  const [adding, setAdding] = useState(false);
  const t = dict.meters.my;

  const form = adding && (
    <MeterForm
      dict={dict}
      properties={properties}
      labelOf={labelOf}
      ownerId={ownerId}
      existing={data.meters}
      propertyId={propertyId}
      onSave={(meter) => {
        data.addMeter(meter);
        setAdding(false);
      }}
      onCancel={() => setAdding(false)}
    />
  );

  if (data.meters.length === 0) {
    return (
      <>
        {form || (
          <section className={styles.card}>
            <h2 className={styles.heading}>{t.empty.title}</h2>
            <p>{t.empty.text}</p>
            <div>
              <Button onClick={() => setAdding(true)}>{dict.meters.common.addMeter}</Button>
            </div>
          </section>
        )}
      </>
    );
  }

  const sorted = [...data.meters].sort(
    (a, b) => Number(isActive(b)) - Number(isActive(a)) || a.serial.localeCompare(b.serial),
  );
  const groups = groupByObject(sorted);

  return (
    <>
      {form || (
        <div className={styles.actions}>
          <Button onClick={() => setAdding(true)}>{dict.meters.common.addMeter}</Button>
        </div>
      )}
      <p className={styles.note} aria-live="polite">
        {format(t.count, { n: data.meters.length })}
      </p>

      {groups.map((group) => (
        <section key={group.propertyId} aria-labelledby={`object-${group.propertyId}`}>
          <h2 id={`object-${group.propertyId}`} className={styles.objectTitle}>
            {t.object}: {group.address}
          </h2>
          <ul className={styles.items}>
            {group.items.map((meter) => (
              <li key={meter.id}>
                <MeterCard lang={lang} dict={dict} meter={meter} readings={data.readings} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function MeterCard({
  lang,
  dict,
  meter,
  readings,
}: {
  lang: Locale;
  dict: MetersDict;
  meter: Meter;
  readings: readonly Reading[];
}) {
  const t = dict.meters.my;
  const f = t.fields;
  const empty = dict.meters.common.emptyValue;
  const previous = previousOf(meter, readings);
  const newest = newestReading(meter.id, readings);
  const make = [meter.manufacturer, meter.model].filter(Boolean).join(" ") || empty;
  const title = `${dict.meters.resources[meter.resource]}, № ${meter.serial}`;

  return (
    <article className={styles.item} aria-label={title}>
      <div className={styles.detailHead}>
        <h3 className={styles.itemTitle}>{title}</h3>
        <span className={styles.badge} data-tone={isActive(meter) ? "done" : "problem"}>
          {dict.meters.states[meter.state]}
        </span>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>{f.resource}</dt>
          <dd>{dict.meters.resources[meter.resource]}</dd>
        </div>
        <div>
          <dt>{f.type}</dt>
          <dd>{dict.meters.types[meter.type]}</dd>
        </div>
        <div>
          <dt>{f.make}</dt>
          <dd>{make}</dd>
        </div>
        <div>
          <dt>{f.serial}</dt>
          <dd>{meter.serial}</dd>
        </div>
        <div>
          <dt>{f.account}</dt>
          <dd>{meter.personalAccount || empty}</dd>
        </div>
        <div>
          <dt>{f.installedAt}</dt>
          <dd>{day(meter.installedAt, lang, empty)}</dd>
        </div>
        <div>
          <dt>{f.commissionedAt}</dt>
          <dd>{day(meter.commissionedAt, lang, empty)}</dd>
        </div>
        <div>
          <dt>{f.lastVerifiedAt}</dt>
          <dd>{day(meter.lastVerifiedAt, lang, empty)}</dd>
        </div>
        <div>
          <dt>{f.nextVerificationAt}</dt>
          <dd>{day(meter.nextVerificationAt, lang, empty)}</dd>
        </div>
        <div>
          <dt>{f.seal}</dt>
          <dd>
            {meter.sealNumber
              ? format(t.sealOn, {
                  number: meter.sealNumber,
                  date: day(meter.sealedAt, lang, empty),
                })
              : t.noSeal}
          </dd>
        </div>
        <div>
          <dt>{f.state}</dt>
          <dd>{dict.meters.states[meter.state]}</dd>
        </div>
        <div>
          <dt>{f.previous}</dt>
          <dd>
            {readingText(previous.value, meter.decimals)} · {day(previous.date, lang, empty)}
          </dd>
        </div>
        <div>
          <dt>{f.lastSent}</dt>
          <dd>{newest ? day(newest.submittedAt, lang, empty) : t.noReading}</dd>
        </div>
        <div>
          <dt>{f.check}</dt>
          <dd>
            {newest ? (
              <ReadingBadge status={newest.status} label={dict.meters.status[newest.status]} />
            ) : (
              t.noCheck
            )}
          </dd>
        </div>
      </dl>

      <details className={styles.details}>
        <summary>{t.history}</summary>
        <ul className={styles.timeline}>
          {meter.history.map((event, index) => (
            <li key={`${event.kind}-${event.at}-${index}`}>
              <span>{day(event.at, lang, empty)}</span>
              <span>
                {dict.meters.eventKinds[event.kind]}
                {event.note ? `: ${event.note}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </details>

      {isActive(meter) ? (
        <div>
          <Link href={`/${lang}/meters/submit?meter=${meter.id}`} className={styles.open}>
            {t.submit}
            <span className="visually-hidden"> — {title}</span>
          </Link>
        </div>
      ) : (
        <p className={styles.note}>{t.inactive}</p>
      )}
    </article>
  );
}
