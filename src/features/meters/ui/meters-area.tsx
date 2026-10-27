"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AccountGate } from "@/features/account/ui/account-gate";
import { AccountNav } from "@/features/account/ui/account-nav";
import { useProperties } from "@/features/account/ui/use-properties";
import { addressLine, canOrderServices, type Property } from "@/features/account/domain/property";
import { ownerIdOf, type DemoSession } from "@/features/session/domain/session";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { requestKinds, type RequestKind } from "../domain/meter-request";
import { useMeterData } from "./use-meter-data";
import styles from "@/shared/ui/cabinet/cabinet.module.css";

/** `contracts` is here only for the words "KB" and "MB" next to file sizes. */
export type MetersDict = Pick<
  Dictionary,
  "meters" | "properties" | "contracts" | "account" | "list"
>;
export type NavId = "my" | "submit" | RequestKind | "history" | "requests";

/** The ten parts of the section "Meters", in the order of the specification (6.2). */
export const NAV_ORDER: readonly NavId[] = [
  "my",
  "submit",
  ...requestKinds.filter((kind) => kind !== "fault"),
  "fault",
  "history",
  "requests",
];

export function pathFor(lang: Locale, id: NavId): string {
  switch (id) {
    case "my":
      return `/${lang}/meters`;
    case "submit":
    case "history":
    case "requests":
      return `/${lang}/meters/${id}`;
    default:
      return `/${lang}/meters/order/${id}`;
  }
}

function MetersNav({ lang, dict, current }: { lang: Locale; dict: MetersDict; current: NavId }) {
  const labels = dict.meters.nav;
  return (
    <nav aria-label={labels.label} className={styles.subnav}>
      <ul className={styles.subnavList}>
        {NAV_ORDER.map((id) => (
          <li key={id}>
            <Link
              href={pathFor(lang, id)}
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

export type MetersContext = {
  session: DemoSession;
  ownerId: string;
  /** Only confirmed objects have services (spec 3.6). */
  properties: Property[];
  labelOf: (property: Property) => string;
  data: ReturnType<typeof useMeterData>;
};

type MetersAreaProps = {
  lang: Locale;
  dict: MetersDict;
  territories: { id: string; name: string }[];
  current: NavId;
  /** Where to come back to after signing in. */
  here: string;
  children: (context: MetersContext) => ReactNode;
};

/** Sign-in check, the menu of the section and what every part needs: objects, meters, readings, requests. */
export function MetersArea(props: MetersAreaProps) {
  const { lang, dict, current, here } = props;
  return (
    <AccountGate
      lang={lang}
      here={here}
      labels={dict.meters.signInRequired}
      operatorNote={dict.meters.operatorNote}
    >
      {(session) => (
        <>
          <AccountNav lang={lang} labels={dict.account.nav} current="meters" />
          <MetersNav lang={lang} dict={dict} current={current} />
          <Content {...props} session={session} />
        </>
      )}
    </AccountGate>
  );
}

function Content({
  lang,
  dict,
  territories,
  children,
  session,
}: MetersAreaProps & { session: DemoSession }) {
  const ownerId = ownerIdOf(session);
  const { mine } = useProperties(ownerId);
  const data = useMeterData(ownerId);
  const properties = mine.filter(canOrderServices);
  const t = dict.meters.noProperties;

  if (properties.length === 0) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{t.title}</h2>
        <p>{t.text}</p>
        <div className={styles.actions}>
          <Button href={`/${lang}/properties/new`}>{t.add}</Button>
          <Button variant="light" href={`/${lang}/properties`}>
            {t.list}
          </Button>
        </div>
      </section>
    );
  }

  const territoryName = (id: string) => territories.find((item) => item.id === id)?.name ?? "";
  const labelOf = (property: Property) =>
    addressLine(property, territoryName(property.territoryId), dict.properties.flat);

  return <>{children({ session, ownerId, properties, labelOf, data })}</>;
}
