"use client";

import Link from "next/link";
import { ownerIdOf } from "@/features/applications/domain/storage";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { addressLine } from "../domain/property";
import { AccountGate } from "./account-gate";
import { useProperties } from "./use-properties";
import { VerificationBadge } from "./verification-badge";
import styles from "./account-styles";

type PropertiesListProps = {
  lang: Locale;
  labels: Dictionary["properties"];
  territories: { id: string; name: string }[];
};

export function PropertiesList({ lang, labels, territories }: PropertiesListProps) {
  return (
    <AccountGate
      lang={lang}
      here={`/${lang}/properties`}
      labels={labels.signInRequired}
      operatorNote={labels.operatorNote}
    >
      {(session) => (
        <List lang={lang} ownerId={ownerIdOf(session)} labels={labels} territories={territories} />
      )}
    </AccountGate>
  );
}

function List({ lang, ownerId, labels, territories }: PropertiesListProps & { ownerId: string }) {
  const { mine } = useProperties(ownerId);
  const names = new Map(territories.map((item) => [item.id, item.name]));

  if (mine.length === 0) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{labels.empty.title}</h2>
        <p>{labels.empty.text}</p>
        <div>
          <Button href={`/${lang}/properties/new`}>{labels.empty.button}</Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <div>
        <Button href={`/${lang}/properties/new`}>{labels.add}</Button>
      </div>
      <ul className={styles.items}>
        {mine.map((item) => (
          <li key={item.id}>
            <article className={styles.item}>
              <div className={styles.itemMain}>
                <h3 className={styles.itemTitle}>
                  {addressLine(item, names.get(item.territoryId) ?? "", labels.flat)}
                </h3>
                <p className={styles.note}>
                  {labels.types[item.type]} · {labels.relations[item.relation]}
                </p>
              </div>
              <VerificationBadge
                status={item.verification.status}
                label={labels.verification[item.verification.status]}
              />
              <Link href={`/${lang}/properties/${item.id}`} className={styles.open}>
                {labels.open}
                <span className="visually-hidden">
                  {" "}
                  {addressLine(item, names.get(item.territoryId) ?? "", labels.flat)}
                </span>
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
