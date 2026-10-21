"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProviderInfo } from "@/features/account/domain/availability";
import { AccountGate } from "@/features/account/ui/account-gate";
import { useProperties } from "@/features/account/ui/use-properties";
import { ownerIdOf } from "@/features/applications/domain/storage";
import { useApplications } from "@/features/applications/ui/use-applications";
import type { Sector } from "@/features/catalog/domain/types";
import { useAppeals } from "@/features/appeals/ui/use-appeals";
import { useContracts } from "@/features/contracts/ui/use-contracts";
import { useMeterData } from "@/features/meters/ui/use-meter-data";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import {
  countStates,
  dueDate,
  filterItems,
  isOverdue,
  registryKinds,
  registryStates,
  type RegistryFilter,
  type RegistryItem,
  type RegistryKind,
  type RegistryState,
} from "../domain/registry";
import {
  fromAppeal,
  fromApplication,
  fromContract,
  fromMeterRequest,
  type RegistryContext,
  type RegistryDict,
} from "./registry-items";
import styles from "./registry.module.css";

type RequestsRegistryProps = {
  lang: Locale;
  dict: RegistryDict;
  providers: readonly ProviderInfo[];
  /** Networks that a directory address does not have, by address id. */
  missing: Record<string, readonly Sector[]>;
};

/** "My requests" (spec 10.1–10.7): every application, request and appeal of the person in one list. */
export function RequestsRegistry(props: RequestsRegistryProps) {
  const { lang, dict } = props;
  return (
    <AccountGate
      lang={lang}
      here={`/${lang}/applications`}
      labels={dict.applications.signInRequired}
      operatorNote={dict.applications.otherRole}
    >
      {(session) => (
        <Registry {...props} ownerId={ownerIdOf(session)} role={session.role} name={session.name} />
      )}
    </AccountGate>
  );
}

const day = (iso: string, lang: Locale) =>
  `${formatDate(iso.slice(0, 10), lang)} ${iso.slice(0, 4)}`;
const time = (iso: string) => iso.slice(11, 16);

function Registry({
  lang,
  dict,
  providers,
  missing,
  ownerId,
  role,
  name,
}: RequestsRegistryProps & { ownerId: string; role: string; name: string }) {
  const t = dict.registry;
  const { applications } = useApplications();
  const { mine: contracts } = useContracts(ownerId);
  const { requests } = useMeterData(ownerId);
  const { mine: appeals } = useAppeals(ownerId);
  const { mine: properties } = useProperties(ownerId);
  const [now] = useState(() => new Date());
  const [filter, setFilter] = useState<RegistryFilter>({ kind: "", state: "", query: "" });

  const items = useMemo(() => {
    const context: RegistryContext = { lang, dict, providers, missing, properties };
    return [
      ...applications
        .filter((item) => item.ownerRole === role)
        .map((item) => fromApplication(item, context)),
      ...contracts.map((item) => fromContract(item, context)),
      ...requests.map((item) => fromMeterRequest(item, context)),
      ...appeals.map((item) => fromAppeal(item, context)),
    ];
  }, [
    applications,
    contracts,
    requests,
    appeals,
    properties,
    role,
    lang,
    dict,
    providers,
    missing,
  ]);

  if (items.length === 0) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{dict.applications.empty.title}</h2>
        <p>{dict.applications.empty.text}</p>
        <div>
          <Button href={`/${lang}/services`}>{dict.applications.empty.button}</Button>
        </div>
      </section>
    );
  }

  const counts = countStates(items);
  const shown = filterItems(items, filter);

  return (
    <>
      <p className={styles.note}>{format(dict.applications.lead, { name })}</p>
      <div className={styles.toolsRow}>
        <Field label={t.filters.kind}>
          {(control) => (
            <select
              {...control}
              value={filter.kind}
              onChange={(event) =>
                setFilter({ ...filter, kind: event.target.value as RegistryKind | "" })
              }
            >
              <option value="">{t.filters.all}</option>
              {registryKinds
                .filter((kind) => items.some((item) => item.kind === kind))
                .map((kind) => (
                  <option key={kind} value={kind}>
                    {t.filters.kinds[kind]}
                  </option>
                ))}
            </select>
          )}
        </Field>
        <Field label={t.filters.state}>
          {(control) => (
            <select
              {...control}
              value={filter.state}
              onChange={(event) =>
                setFilter({ ...filter, state: event.target.value as RegistryState | "" })
              }
            >
              <option value="">{t.filters.all}</option>
              {registryStates.map((state) => (
                <option key={state} value={state}>
                  {format(t.filters.states[state], { n: counts[state] })}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t.filters.query}>
          {(control) => (
            <input
              {...control}
              type="search"
              autoComplete="off"
              value={filter.query}
              onChange={(event) => setFilter({ ...filter, query: event.target.value })}
            />
          )}
        </Field>
      </div>
      <p className={styles.note} aria-live="polite">
        {format(t.count, { n: shown.length })}
      </p>

      {shown.length === 0 ? (
        <p>{t.emptyFiltered}</p>
      ) : (
        <>
          <h2 className="visually-hidden">{dict.applications.list}</h2>
          <ul className={styles.items}>
            {shown.map((item) => (
              <li key={item.id}>
                <Card lang={lang} dict={dict} item={item} now={now} />
              </li>
            ))}
          </ul>
        </>
      )}
      <p className={styles.note}>{t.archiveNote}</p>
    </>
  );
}

function Card({
  lang,
  dict,
  item,
  now,
}: {
  lang: Locale;
  dict: RegistryDict;
  item: RegistryItem;
  now: Date;
}) {
  const t = dict.registry;
  const f = t.fields;
  const due = dueDate(item);
  const late = isOverdue(item, now);
  const title = item.number ? `${item.title}, ${item.number}` : item.title;

  return (
    <article className={styles.item} aria-label={title}>
      <div className={styles.detailHead}>
        <div>
          <h3 className={styles.itemTitle}>{item.title}</h3>
          <p className={styles.kind}>{t.filters.kinds[item.kind]}</p>
        </div>
        <span className={styles.badge} data-tone={item.tone}>
          {item.status}
        </span>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>{f.number}</dt>
          <dd>{item.number ?? t.noNumber}</dd>
        </div>
        <div>
          <dt>{f.submitted}</dt>
          <dd>
            {day(item.at, lang)}, {time(item.at)} UTC
          </dd>
        </div>
        <div>
          <dt>{f.object}</dt>
          <dd>{item.address}</dd>
        </div>
        <div>
          <dt>{f.organization}</dt>
          <dd>{item.organization}</dd>
        </div>
        <div>
          <dt>{f.description}</dt>
          <dd>{item.description || t.noValue}</dd>
        </div>
        <div>
          <dt>{f.assignee}</dt>
          <dd>{item.assignee ?? t.notAssigned}</dd>
        </div>
        <div>
          <dt>{f.due}</dt>
          <dd className={late ? styles.late : undefined}>
            {item.closed
              ? t.noValue
              : late
                ? format(t.overdue, { date: day(due, lang) })
                : day(due, lang)}
          </dd>
        </div>
        <div>
          <dt>{f.files}</dt>
          <dd>{item.filesCount > 0 ? item.filesCount : t.noValue}</dd>
        </div>
        {item.result && (
          <div>
            <dt>{f.result}</dt>
            <dd>{item.result}</dd>
          </div>
        )}
      </dl>
      {item.remarks && (
        <p className={styles.remark}>
          <strong>{f.remarks}:</strong> {item.remarks}
        </p>
      )}
      <div className={styles.actions}>
        {item.needsAction && item.actionHref && (
          <Button href={item.actionHref}>{item.actionLabel}</Button>
        )}
        <Link href={item.href} className={styles.open}>
          {t.actions.open}
          <span className="visually-hidden"> — {title}</span>
        </Link>
      </div>
    </article>
  );
}
