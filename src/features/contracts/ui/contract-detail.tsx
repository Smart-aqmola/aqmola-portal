"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountGate } from "@/features/account/ui/account-gate";
import { ownerIdOf } from "@/features/applications/domain/storage";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { downloadText } from "@/shared/lib/download-text";
import { Button } from "@/shared/ui/button/button";
import { useToast } from "@/shared/ui/toast/toast-provider";
import {
  applicantName,
  hasContractText,
  isConcluded,
  providerChange,
  providerOptions,
  signContract,
  type ContractApplication,
  type ContractStatus,
} from "../domain/contract";
import { contractFileText, formatStamp, receiptText } from "./contract-texts";
import { ChangeRequest } from "./change-request";
import { ContractDocuments } from "./contract-documents";
import { ContractWizard } from "./contract-wizard";
import { StatusBadge } from "./status-badge";
import { useContracts } from "./use-contracts";
import styles from "./contracts-styles";

type ContractPageProps = {
  lang: Locale;
  id: string;
  dict: Pick<Dictionary, "contracts" | "properties">;
};

/** The page of one contract application: the wizard while it is a draft, the status afterwards. */
export function ContractPage(props: ContractPageProps) {
  const { lang, id, dict } = props;
  return (
    <AccountGate
      lang={lang}
      here={`/${lang}/contracts/${id}`}
      labels={dict.contracts.signInRequired}
      operatorNote={dict.contracts.operatorNote}
    >
      {(session) => <Loaded {...props} ownerId={ownerIdOf(session)} />}
    </AccountGate>
  );
}

function Loaded({ lang, id, dict, ownerId }: ContractPageProps & { ownerId: string }) {
  const { mine, replace, takeNumber } = useContracts(ownerId);
  const [revising, setRevising] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const app = mine.find((item) => item.id === id);
  const t = dict.contracts;

  if (!app) {
    return (
      <section className={styles.card}>
        <h1 className={styles.heading}>{t.detail.notFound.title}</h1>
        <p>{t.detail.notFound.text}</p>
        <div>
          <Button href={`/${lang}/contracts/new`}>{t.detail.notFound.button}</Button>
        </div>
      </section>
    );
  }

  const editing = app.status === "draft" || (revising && app.status === "returned_for_revision");
  if (editing) {
    return (
      <>
        <h1 className={styles.pageTitle}>{t.sectorTitles[app.sector]}</h1>
        <ContractWizard
          app={app}
          lang={lang}
          dict={dict}
          onChange={replace}
          takeNumber={takeNumber}
          onSent={() => {
            setRevising(false);
            setJustSent(true);
          }}
        />
      </>
    );
  }

  return (
    <Detail
      app={app}
      lang={lang}
      dict={dict}
      justSent={justSent}
      onChange={replace}
      onRevise={() => setRevising(true)}
    />
  );
}

type DetailProps = {
  app: ContractApplication;
  lang: Locale;
  dict: Pick<Dictionary, "contracts" | "properties">;
  justSent: boolean;
  onChange: (app: ContractApplication) => void;
  onRevise: () => void;
};

function Detail({ app, lang, dict, justSent, onChange, onRevise }: DetailProps) {
  const toast = useToast();
  const t = dict.contracts;
  const d = t.detail;
  const hasContract = hasContractText(app.status);
  const options = providerOptions(app.status);

  function moveProvider(to: ContractStatus) {
    const note =
      to === "returned_for_revision"
        ? d.providerPanel.notes.returned
        : to === "refused"
          ? d.providerPanel.notes.refused
          : undefined;
    const result = providerChange(app, to, new Date(), note);
    if (result.ok) onChange(result.application);
  }

  function signTheContract() {
    const result = signContract(app, applicantName(app.applicant), new Date());
    if (!result.ok) return;
    onChange(result.application);
    toast.show(d.hints.awaiting_provider_signature);
  }

  return (
    <>
      <Link href={`/${lang}/contracts`} className={styles.back}>
        ← {d.back}
      </Link>
      <div className={styles.detailHead}>
        <h1 className={styles.pageTitle}>{t.sectorTitles[app.sector]}</h1>
        <StatusBadge status={app.status} label={t.status[app.status]} />
      </div>

      {justSent && <p className={styles.demo}>{d.justSent}</p>}
      <p className={styles.hint}>{d.hints[app.status]}</p>

      <section className={styles.card} aria-label={d.number}>
        <dl className={styles.facts}>
          <div>
            <dt>{d.number}</dt>
            <dd>{app.number ?? d.draftNumber}</dd>
          </div>
          {app.submittedAt && (
            <div>
              <dt>{d.registeredAt}</dt>
              <dd>{formatStamp(app.submittedAt, lang)}</dd>
            </div>
          )}
          <div>
            <dt>{d.provider}</dt>
            <dd>{app.providerName}</dd>
          </div>
          <div>
            <dt>{d.address}</dt>
            <dd>{app.address}</dd>
          </div>
          <div>
            <dt>{d.applicant}</dt>
            <dd>{applicantName(app.applicant)}</dd>
          </div>
        </dl>
        {app.number && (
          <div>
            <Button
              variant="light"
              onClick={() => downloadText("podtverzhdenie.txt", receiptText(app, dict, lang))}
            >
              {d.receipt.download}
            </Button>
          </div>
        )}
      </section>

      {app.remarks && (app.status === "returned_for_revision" || app.status === "refused") && (
        <section className={styles.card} aria-labelledby="remarks-title">
          <h2 id="remarks-title" className={styles.heading}>
            {d.remarksTitle}
          </h2>
          <p>{app.remarks}</p>
          {app.status === "returned_for_revision" && (
            <div>
              <Button onClick={onRevise}>{d.fix}</Button>
            </div>
          )}
        </section>
      )}

      {hasContract && (
        <div className={styles.card}>
          <h2 id="contract-title" className={styles.heading}>
            {d.contract.title}
          </h2>
          {app.status === "awaiting_applicant_signature" && <p>{d.contract.ready}</p>}
          {isConcluded(app.status) && (
            <p className={styles.signed}>
              {d.contract.concluded}
              {app.startsAt &&
                ` ${format(d.contract.startsAt, {
                  date: `${formatDate(app.startsAt.slice(0, 10), lang)} ${app.startsAt.slice(0, 4)}`,
                })}`}
            </p>
          )}
          <div
            className={styles.contractText}
            tabIndex={0}
            role="region"
            aria-labelledby="contract-title"
          >
            {contractFileText(app, dict, lang)
              .split("\n\n")
              .map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
          </div>
          <div className={styles.actions}>
            {app.status === "awaiting_applicant_signature" && (
              <Button onClick={signTheContract}>{d.contract.sign}</Button>
            )}
            <Button
              variant="light"
              onClick={() => downloadText("dogovor.txt", contractFileText(app, dict, lang))}
            >
              {d.contract.download}
            </Button>
          </div>
        </div>
      )}

      <ContractDocuments app={app} lang={lang} dict={dict} />

      <ChangeRequest app={app} lang={lang} dict={dict} onChange={onChange} />

      <section className={styles.card} aria-labelledby="history-title">
        <h2 id="history-title" className={styles.heading}>
          {d.historyTitle}
        </h2>
        <ol className={styles.history}>
          {app.history.map((entry, index) => (
            <li key={`${entry.at}-${index}`}>
              <StatusBadge status={entry.status} label={t.status[entry.status]} />
              <span className={styles.note}>
                {entry.actor === "provider" ? d.actorProvider : d.actorApplicant} ·{" "}
                {formatStamp(entry.at, lang)}
              </span>
              {entry.note && <span>{entry.note}</span>}
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.card} aria-labelledby="provider-title">
        <div>
          <h2 id="provider-title" className={styles.heading}>
            {d.providerPanel.title}
          </h2>
          <p className={styles.note}>{d.providerPanel.lead}</p>
        </div>
        {options.length === 0 ? (
          <p className={styles.note}>{d.providerPanel.none}</p>
        ) : (
          <div className={styles.actions}>
            {options.map((to) => (
              <Button key={to} variant="light" onClick={() => moveProvider(to)}>
                {d.providerPanel.actions[to as keyof typeof d.providerPanel.actions]}
              </Button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
