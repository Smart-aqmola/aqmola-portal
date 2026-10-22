"use client";

import { ShowMoreList } from "@/shared/ui/show-more/show-more";
import { useState } from "react";
import type { ProviderInfo } from "@/features/account/domain/availability";
import { maskIin } from "@/features/account/domain/iin";
import {
  applicantName,
  assignAccount,
  contractStatuses,
  providerChange,
  providerOptions,
  type ContractApplication,
  type ContractStatus,
} from "@/features/contracts/domain/contract";
import { StatusBadge } from "@/features/contracts/ui/status-badge";
import { useAllContracts } from "@/features/contracts/ui/use-contracts";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { useToast } from "@/shared/ui/toast/toast-provider";
import { contractsOf } from "../domain/scope";
import { OperatorArea, type OperatorContext, type OperatorDict } from "./operator-area";
import styles from "./organization-styles";

type Props = { lang: Locale; dict: OperatorDict; providers: readonly ProviderInfo[] };

/** The register of applications and contracts of the provider, with the actions of its staff (spec 12.2, 12.4). */
export function OperatorContracts(props: Props) {
  return (
    <OperatorArea {...props} current="contracts">
      {(context) => <Register {...props} context={context} />}
    </OperatorArea>
  );
}

const day = (iso: string | undefined, lang: Locale, empty: string) =>
  iso ? `${formatDate(iso.slice(0, 10), lang)} ${iso.slice(0, 4)}` : empty;

function Register({ lang, dict, context }: Props & { context: OperatorContext }) {
  const t = dict.cabinet.contracts;
  const c = dict.cabinet.common;
  const { all, replace } = useAllContracts();
  const [status, setStatus] = useState<ContractStatus | "">("");
  const [query, setQuery] = useState("");

  const mine = contractsOf(context.org, all);
  const text = query.trim().toLowerCase();
  const shown = mine
    .filter((item) => !status || item.status === status)
    .filter(
      (item) =>
        !text ||
        (item.number ?? "").toLowerCase().includes(text) ||
        item.address.toLowerCase().includes(text),
    )
    .sort((a, b) => (b.submittedAt ?? b.updatedAt).localeCompare(a.submittedAt ?? a.updatedAt));

  return (
    <>
      <div>
        <h2 className={styles.sectionTitle}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>
      {mine.length === 0 ? (
        <p>{c.noItems}</p>
      ) : (
        <>
          <div className={styles.listTools}>
            <Field label={c.status}>
              {(control) => (
                <select
                  {...control}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ContractStatus | "")}
                >
                  <option value="">{c.all}</option>
                  {contractStatuses
                    .filter((item) => mine.some((entry) => entry.status === item))
                    .map((item) => (
                      <option key={item} value={item}>
                        {dict.contracts.status[item]}
                      </option>
                    ))}
                </select>
              )}
            </Field>
            <Field label={c.search}>
              {(control) => (
                <input
                  {...control}
                  type="search"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              )}
            </Field>
          </div>
          <p className={styles.note} aria-live="polite">
            {format(c.count, { n: shown.length })}
          </p>
          {shown.length === 0 ? (
            <p>{c.noMatch}</p>
          ) : (
            <ShowMoreList items={shown} labels={dict.list}>
              {(visible) => (
                <ul className={styles.items}>
                  {visible.map((item) => (
                    <li key={item.id}>
                      <Card
                        lang={lang}
                        dict={dict}
                        app={item}
                        context={context}
                        onChange={replace}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </ShowMoreList>
          )}
        </>
      )}
    </>
  );
}

function Card({
  lang,
  dict,
  app,
  context,
  onChange,
}: {
  lang: Locale;
  dict: OperatorDict;
  app: ContractApplication;
  context: OperatorContext;
  onChange: (app: ContractApplication) => void;
}) {
  const t = dict.cabinet.contracts;
  const f = t.fields;
  const empty = dict.cabinet.common.noValue;
  const title = app.number ? `${app.serviceTitle}, ${app.number}` : app.serviceTitle;

  return (
    <article className={styles.item} aria-label={title}>
      <div className={styles.detailHead}>
        <h3 className={styles.itemTitle}>{app.serviceTitle}</h3>
        <StatusBadge status={app.status} label={dict.contracts.status[app.status]} />
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>{f.number}</dt>
          <dd>{app.number ?? empty}</dd>
        </div>
        <div>
          <dt>{f.applicant}</dt>
          <dd>{applicantName(app.applicant)}</dd>
        </div>
        <div>
          <dt>{f.address}</dt>
          <dd>{app.address}</dd>
        </div>
        <div>
          <dt>{f.submitted}</dt>
          <dd>{day(app.submittedAt, lang, empty)}</dd>
        </div>
        <div>
          <dt>{f.account}</dt>
          <dd>{app.personalAccount || t.noAccount}</dd>
        </div>
      </dl>
      {app.remarks && (
        <p>
          <strong>{f.remarks}:</strong> {app.remarks}
        </p>
      )}
      <details className={styles.details}>
        <summary>{dict.cabinet.common.details}</summary>
        <dl className={styles.facts}>
          <div>
            <dt>{f.iin}</dt>
            <dd>{maskIin(app.applicant.iin)}</dd>
          </div>
          <div>
            <dt>{f.phone}</dt>
            <dd>{app.applicant.phone}</dd>
          </div>
          <div>
            <dt>{f.basis}</dt>
            <dd>{dict.properties.relations[app.basis]}</dd>
          </div>
          <div>
            <dt>{f.meter}</dt>
            <dd>{app.meter.has ? `${app.meter.serial}, ${app.meter.reading}` : t.noMeter}</dd>
          </div>
          <div>
            <dt>{f.docs}</dt>
            <dd>
              {app.attachments.length === 0
                ? empty
                : app.attachments
                    .map((file) => `${dict.contracts.documents.names[file.key]}: ${file.name}`)
                    .join("; ")}
            </dd>
          </div>
        </dl>
      </details>
      <Actions dict={dict} app={app} context={context} onChange={onChange} />
    </article>
  );
}

function Actions({
  dict,
  app,
  context,
  onChange,
}: {
  dict: OperatorDict;
  app: ContractApplication;
  context: OperatorContext;
  onChange: (app: ContractApplication) => void;
}) {
  const t = dict.cabinet.contracts;
  const toast = useToast();
  const options = providerOptions(app.status);
  const [action, setAction] = useState<ContractStatus | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [account, setAccount] = useState(app.personalAccount);
  const [accountError, setAccountError] = useState<string>();

  function choose(value: string) {
    const next = value as ContractStatus | "";
    setAction(next);
    setError(undefined);
    setNote(next === "returned_for_revision" || next === "refused" ? t.noteDefaults[next] : "");
  }

  function apply() {
    if (!action) return;
    const result = providerChange(app, action, new Date(), note);
    if (!result.ok) {
      setError(result.reason === "no_remarks" ? t.noteRequired : t.stale);
      return;
    }
    onChange(result.application);
    context.record({
      entity: "contract",
      entityId: app.id,
      number: app.number ?? app.id,
      action: "status",
      from: app.status,
      to: action,
      note,
    });
    setAction("");
    setNote("");
    toast.show(t.applied);
  }

  function saveAccount() {
    const result = assignAccount(app, account, new Date());
    if (!result.ok) {
      setAccountError(result.reason === "invalid" ? t.account.invalid : t.account.closed);
      return;
    }
    onChange(result.application);
    context.record({
      entity: "contract",
      entityId: app.id,
      number: app.number ?? app.id,
      action: "account",
      from: app.personalAccount || undefined,
      to: result.application.personalAccount,
    });
    setAccountError(undefined);
    toast.show(t.account.assigned);
  }

  return (
    <div className={styles.actionsBox}>
      <Field label={t.account.label} hint={t.account.hint} error={accountError}>
        {(control) => (
          <input
            {...control}
            inputMode="numeric"
            value={account}
            onChange={(event) => setAccount(event.target.value)}
          />
        )}
      </Field>
      <div>
        <Button variant="light" onClick={saveAccount}>
          {t.account.assign}
        </Button>
      </div>

      {options.length === 0 ? (
        <p className={styles.note}>{t.final}</p>
      ) : (
        <>
          <Field label={t.action}>
            {(control) => (
              <select {...control} value={action} onChange={(event) => choose(event.target.value)}>
                <option value="">{t.choose}</option>
                {options.map((item) => (
                  <option key={item} value={item}>
                    {t.moves[item as keyof typeof t.moves]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {(action === "returned_for_revision" || action === "refused") && (
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
          {error && action !== "returned_for_revision" && action !== "refused" && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div>
            <Button onClick={apply}>{t.apply}</Button>
          </div>
        </>
      )}
    </div>
  );
}
