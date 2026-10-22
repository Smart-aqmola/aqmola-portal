"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountGate } from "@/features/account/ui/account-gate";
import { ownerIdOf } from "@/features/applications/domain/storage";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import {
  contractStatuses,
  signedAt,
  type ContractApplication,
  type ContractStatus,
} from "../domain/contract";
import { StatusBadge } from "./status-badge";
import { useContracts } from "./use-contracts";
import styles from "./contracts-styles";

type ContractsListProps = {
  lang: Locale;
  dict: Pick<Dictionary, "contracts" | "contractsList">;
};

/** The page "my contracts": every application and contract of the person, grouped by object (spec 5.2). */
export function ContractsList(props: ContractsListProps) {
  const { lang, dict } = props;
  return (
    <AccountGate
      lang={lang}
      here={`/${lang}/contracts`}
      labels={dict.contractsList.signInRequired}
      operatorNote={dict.contractsList.operatorNote}
    >
      {(session) => <List {...props} ownerId={ownerIdOf(session)} />}
    </AccountGate>
  );
}

function day(iso: string | undefined, lang: Locale, empty: string): string {
  return iso ? `${formatDate(iso.slice(0, 10), lang)} ${iso.slice(0, 4)}` : empty;
}

/** Groups the applications by object, keeping the order in which the objects were first met. */
function groupByObject(items: readonly ContractApplication[]) {
  const groups = new Map<string, { address: string; items: ContractApplication[] }>();
  for (const item of items) {
    const group = groups.get(item.propertyId) ?? { address: item.address, items: [] };
    group.items.push(item);
    groups.set(item.propertyId, group);
  }
  return [...groups.entries()].map(([propertyId, group]) => ({ propertyId, ...group }));
}

function List({ lang, dict, ownerId }: ContractsListProps & { ownerId: string }) {
  const { mine } = useContracts(ownerId);
  const [filter, setFilter] = useState<ContractStatus | "">("");
  const t = dict.contractsList;
  const f = t.fields;

  if (mine.length === 0) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{t.empty.title}</h2>
        <p>{t.empty.text}</p>
        <div>
          <Button href={`/${lang}/contracts/new`}>{t.empty.button}</Button>
        </div>
      </section>
    );
  }

  const present = contractStatuses.filter((status) => mine.some((item) => item.status === status));
  const shown = [...mine]
    .filter((item) => !filter || item.status === filter)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const groups = groupByObject(shown);

  return (
    <>
      <div className={styles.listTools}>
        <Button href={`/${lang}/contracts/new`}>{t.add}</Button>
        <Field label={t.filter}>
          {(control) => (
            <select
              {...control}
              value={filter}
              onChange={(event) => setFilter(event.target.value as ContractStatus | "")}
            >
              <option value="">{t.all}</option>
              {present.map((status) => (
                <option key={status} value={status}>
                  {dict.contracts.status[status]}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <p className={styles.note} aria-live="polite">
        {format(t.count, { n: shown.length })}
      </p>

      {groups.map((group) => (
        <section key={group.propertyId} aria-labelledby={`object-${group.propertyId}`}>
          <h2 id={`object-${group.propertyId}`} className={styles.objectTitle}>
            {t.object}: {group.address}
          </h2>
          <ul className={styles.items}>
            {group.items.map((item) => {
              const empty = t.emptyValue;
              const href = `/${lang}/contracts/${item.id}`;
              const action =
                item.status === "draft"
                  ? t.resume
                  : item.status === "returned_for_revision"
                    ? t.fix
                    : t.open;
              return (
                <li key={item.id}>
                  <article className={styles.contract}>
                    <div className={styles.detailHead}>
                      <h3 className={styles.wayTitle}>{item.serviceTitle}</h3>
                      <StatusBadge
                        status={item.status}
                        label={dict.contracts.status[item.status]}
                      />
                    </div>
                    <dl className={styles.facts}>
                      <div>
                        <dt>{f.provider}</dt>
                        <dd>{item.providerName}</dd>
                      </div>
                      <div>
                        <dt>{f.number}</dt>
                        <dd>{item.number ?? empty}</dd>
                      </div>
                      <div>
                        <dt>{f.submittedOn}</dt>
                        <dd>{day(item.submittedAt, lang, empty)}</dd>
                      </div>
                      <div>
                        <dt>{f.signedOn}</dt>
                        <dd>{day(signedAt(item), lang, empty)}</dd>
                      </div>
                      <div>
                        <dt>{f.startsOn}</dt>
                        <dd>{day(item.startsAt, lang, empty)}</dd>
                      </div>
                      <div>
                        <dt>{f.account}</dt>
                        <dd>{item.personalAccount || empty}</dd>
                      </div>
                      <div>
                        <dt>{f.address}</dt>
                        <dd>{item.address}</dd>
                      </div>
                      <div>
                        <dt>{f.meters}</dt>
                        <dd>{item.meter.has ? item.meter.serial : t.noMeters}</dd>
                      </div>
                      <div>
                        <dt>{f.debt}</dt>
                        <dd>{t.debtUnknown}</dd>
                      </div>
                    </dl>
                    <div>
                      <Link href={href} className={styles.open}>
                        {action}
                        <span className="visually-hidden"> — {item.serviceTitle}</span>
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
