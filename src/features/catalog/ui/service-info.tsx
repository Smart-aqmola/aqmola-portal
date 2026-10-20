import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import type { ServiceDetails } from "../load-service";
import styles from "./service-info.module.css";

type InfoDict = Pick<Dictionary, "serviceDetails" | "home">;

/** The path to the result, as a numbered list: here the order really matters. */
export function StepsList({ steps, dict }: { steps: ServiceDetails["steps"]; dict: InfoDict }) {
  const { steps: labels } = dict.serviceDetails;
  return (
    <section>
      <h2 className={styles.heading}>{labels.title}</h2>
      <ol className={styles.steps}>
        {steps.map((step) => (
          <li key={step}>{labels.items[step]}</li>
        ))}
      </ol>
    </section>
  );
}

export function DocumentsList({
  documents,
  dict,
}: {
  documents: ServiceDetails["documents"];
  dict: InfoDict;
}) {
  const { documents: labels } = dict.serviceDetails;
  return (
    <section>
      <h2 className={styles.heading}>{labels.title}</h2>
      <ul className={styles.documents}>
        {documents.map((document) => (
          <li key={document}>{labels.items[document]}</li>
        ))}
      </ul>
    </section>
  );
}

/** The reference card next to the description: who provides the service, how long it takes, where. */
export function FactsPanel({
  details,
  lang,
  dict,
}: {
  details: ServiceDetails;
  lang: Locale;
  dict: InfoDict;
}) {
  const f = dict.serviceDetails.facts;
  const s = dict.home.service;
  const { card } = details;
  const audience = { resident: s.resident, business: s.business, both: s.both }[card.audience];
  const area = details.area.kind === "region" ? f.allRegion : details.area.names.join(", ");

  const rows: [string, string][] = [
    [f.provider, card.organization],
    [f.audience, audience],
    [f.channel, card.channel === "online" ? f.online : f.visit],
    [f.cost, card.free ? f.free : "—"],
    [f.term, format(f.days, { n: card.workingDays })],
    [f.area, area],
    [f.updated, formatDateWithYear(details.updatedAt, lang)],
    ...(details.fullTitle ? ([[f.fullTitle, details.fullTitle]] as [string, string][]) : []),
    [f.code, card.code],
  ];

  return (
    <aside className={styles.facts} aria-labelledby="facts-title">
      <h2 className={styles.factsTitle} id="facts-title">
        {f.title}
      </h2>
      <dl className={styles.list}>
        {rows.map(([term, value]) => (
          <div key={term} className={styles.row}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function formatDateWithYear(isoDate: string, lang: Locale): string {
  return `${formatDate(isoDate, lang)} ${isoDate.slice(0, 4)}`;
}
