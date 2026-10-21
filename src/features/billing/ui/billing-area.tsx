"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { ProviderInfo } from "@/features/account/domain/availability";
import { addressLine, canOrderServices, type Property } from "@/features/account/domain/property";
import { AccountGate } from "@/features/account/ui/account-gate";
import { AccountNav } from "@/features/account/ui/account-nav";
import { useProfiles } from "@/features/account/ui/use-profiles";
import { useProperties } from "@/features/account/ui/use-properties";
import { ownerIdOf, type DemoSession } from "@/features/applications/domain/storage";
import type { Sector } from "@/features/catalog/domain/types";
import type { Locale } from "@/shared/i18n/config";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { getChargeRepository } from "../data";
import { periodOf, type Charge } from "../domain/charge";
import { connectedProviders } from "../domain/connected";
import { applyPayments } from "../domain/payment";
import type { BillingDict } from "./billing-texts";
import { usePayments } from "./use-payments";
import styles from "./billing.module.css";

export type BillingNavId = "charges" | "receipt" | "pay" | "payments";

const HREFS: Record<BillingNavId, string> = {
  charges: "billing",
  receipt: "billing/receipt",
  pay: "billing/pay",
  payments: "billing/payments",
};

function BillingNav({
  lang,
  dict,
  current,
}: {
  lang: Locale;
  dict: BillingDict;
  current: BillingNavId;
}) {
  const labels = dict.billing.nav;
  return (
    <nav aria-label={labels.label} className={styles.subnav}>
      <ul className={styles.subnavList}>
        {(Object.keys(HREFS) as BillingNavId[]).map((id) => (
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

export type BillingContext = {
  ownerId: string;
  /** Only confirmed objects have services (spec 3.6). */
  properties: Property[];
  labelOf: (property: Property) => string;
  /** The name to write on the receipt. */
  payer: string;
  now: Date;
  /** The current month, `YYYY-MM`. */
  period: string;
  /** The charges of an object with the paid payments already taken in (spec 9.15). */
  chargesOf: (property: Property) => Charge[];
  payments: ReturnType<typeof usePayments>;
};

type BillingAreaProps = {
  lang: Locale;
  dict: BillingDict;
  territories: { id: string; name: string }[];
  providers: readonly ProviderInfo[];
  /** Networks that a directory address does not have, by address id. */
  missing: Record<string, readonly Sector[]>;
  current: BillingNavId;
  /** Where to come back to after signing in. */
  here: string;
  children: (context: BillingContext) => ReactNode;
};

/** Sign-in check, the menu of the section and what every part needs: objects, charges, payments. */
export function BillingArea(props: BillingAreaProps) {
  const { lang, dict, current, here } = props;
  return (
    <AccountGate
      lang={lang}
      here={here}
      labels={dict.billing.signInRequired}
      operatorNote={dict.billing.operatorNote}
    >
      {(session) => (
        <>
          <AccountNav lang={lang} labels={dict.account.nav} current="billing" />
          <BillingNav lang={lang} dict={dict} current={current} />
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
  providers,
  missing,
  children,
  session,
}: BillingAreaProps & { session: DemoSession }) {
  const ownerId = ownerIdOf(session);
  const { mine } = useProperties(ownerId);
  const { profiles } = useProfiles();
  const payments = usePayments(ownerId);
  const [now] = useState(() => new Date());
  const properties = mine.filter(canOrderServices);
  const t = dict.billing.noProperties;

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
  const profile = profiles.find((item) => item.id === session.userId);
  const payer = profile
    ? [profile.lastName, profile.firstName, profile.middleName].filter(Boolean).join(" ")
    : session.name;

  function chargesOf(property: Property): Charge[] {
    const feed = connectedProviders(
      {
        territoryId: property.territoryId,
        without: property.addressId ? (missing[property.addressId] ?? []) : [],
      },
      providers,
    );
    const charges = getChargeRepository().listForProperty({
      propertyId: property.id,
      providers: feed,
      now,
    });
    return applyPayments(charges, payments.mine);
  }

  return (
    <>
      {children({
        ownerId,
        properties,
        labelOf,
        payer,
        now,
        period: periodOf(now),
        chargesOf,
        payments,
      })}
    </>
  );
}

/** The object the person looks at: the one asked for, or the only one, or the first to choose from. */
export function useChosenObject(properties: readonly Property[], preset?: string) {
  const initial = properties.find((item) => item.id === preset)?.id ?? properties[0]?.id ?? "";
  const [id, setId] = useState(initial);
  const property = properties.find((item) => item.id === id) ?? properties[0];
  return { property, setId };
}

/** The select "Object", shown only when there is a choice to make. */
export function ObjectSelect({
  dict,
  properties,
  labelOf,
  value,
  onChange,
}: {
  dict: BillingDict;
  properties: readonly Property[];
  labelOf: (property: Property) => string;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Field label={dict.billing.common.property} required>
      {(control) => (
        <select {...control} value={value} onChange={(event) => onChange(event.target.value)}>
          {properties.map((item) => (
            <option key={item.id} value={item.id}>
              {labelOf(item)}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
