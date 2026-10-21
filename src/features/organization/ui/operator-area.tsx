"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ProviderInfo } from "@/features/account/domain/availability";
import { useSession } from "@/features/applications/ui/use-session";
import type { DemoSession } from "@/features/applications/domain/storage";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { orgFromProviders, type OrgInfo } from "../domain/scope";
import { useAudit } from "./use-audit";
import styles from "./organization.module.css";

export type OperatorDict = Pick<
  Dictionary,
  | "cabinet"
  | "operator"
  | "status"
  | "contracts"
  | "meters"
  | "appeals"
  | "billing"
  | "applications"
  | "properties"
  | "account"
>;

export type OperatorNavId =
  | "applications"
  | "contracts"
  | "meters"
  | "readings"
  | "appeals"
  | "payments"
  | "calendar"
  | "audit";

const HREFS: Record<OperatorNavId, string> = {
  applications: "operator",
  contracts: "operator/contracts",
  meters: "operator/meters",
  readings: "operator/readings",
  appeals: "operator/appeals",
  payments: "operator/payments",
  calendar: "operator/calendar",
  audit: "operator/audit",
};

/** The sections of the cabinet of an organization (spec 12.2). */
export function OperatorNav({
  lang,
  labels,
  current,
}: {
  lang: Locale;
  labels: OperatorDict["cabinet"]["nav"];
  current: OperatorNavId;
}) {
  return (
    <nav aria-label={labels.label} className={styles.tabs}>
      <ul className={styles.subnavList}>
        {(Object.keys(HREFS) as OperatorNavId[]).map((id) => (
          <li key={id}>
            <Link
              href={`/${lang}/${HREFS[id]}`}
              className={styles.subnavLink}
              aria-current={id === current ? "page" : undefined}
            >
              {labels[id]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export type OperatorContext = {
  session: DemoSession;
  org: OrgInfo;
  /** Writes a line in the journal of the employee's actions (spec 12.7). */
  record: (
    entry: Omit<Parameters<ReturnType<typeof useAudit>["log"]>[0], "organizationId" | "actor">,
  ) => void;
};

type OperatorAreaProps = {
  lang: Locale;
  dict: OperatorDict;
  providers: readonly ProviderInfo[];
  current: OperatorNavId;
  children: (context: OperatorContext) => ReactNode;
};

/** Only an employee of an organization gets in; everything inside is scoped to that organization (spec 12.1, 12.3). */
export function OperatorArea({ lang, dict, providers, current, children }: OperatorAreaProps) {
  const { session, ready } = useSession();
  const { log } = useAudit();

  if (!ready) return <div className={styles.card} aria-hidden="true" />;

  const org =
    session?.role === "operator" ? orgFromProviders(session.organizationId, providers) : undefined;
  if (!session || session.role !== "operator" || !org) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{dict.operator.signInRequired.title}</h2>
        <p>{session ? dict.operator.notOperator : dict.operator.signInRequired.text}</p>
        <div>
          <Button href={`/${lang}/sign-in`}>{dict.operator.signInRequired.button}</Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <p className={styles.note}>{format(dict.cabinet.lead, { org: org.name })}</p>
      <OperatorNav lang={lang} labels={dict.cabinet.nav} current={current} />
      {children({
        session,
        org,
        record: (entry) => log({ ...entry, organizationId: org.id, actor: session.name }),
      })}
    </>
  );
}
