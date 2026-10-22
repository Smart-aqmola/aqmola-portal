"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccountGate } from "@/features/account/ui/account-gate";
import { useProfiles } from "@/features/account/ui/use-profiles";
import { useProperties } from "@/features/account/ui/use-properties";
import {
  CONTRACT_SECTORS,
  canOfferContract,
  servicesAtAddress,
  type ContractSector,
  type ProviderInfo,
} from "@/features/account/domain/availability";
import { addressLine, canOrderServices, type Property } from "@/features/account/domain/property";
import { ownerIdOf, type DemoSession } from "@/features/applications/domain/storage";
import type { Sector } from "@/features/catalog/domain/types";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { createDraft, type ApplicantInfo } from "../domain/contract";
import { contractServiceBySlug, serviceSlugFor } from "../domain/contract-services";
import { useContracts } from "./use-contracts";
import styles from "./contracts-styles";

export type ContractNewProps = {
  lang: Locale;
  dict: Pick<Dictionary, "contracts" | "properties">;
  providers: readonly ProviderInfo[];
  /** Networks that a directory address does not have, by address id. */
  missing: Record<string, readonly Sector[]>;
  territories: { id: string; name: string }[];
  /** What the address asked for: a service of the catalog and/or an object. */
  /** From a link: the object, the service and, when the person picked one, the provider. */
  preset: { service?: string; property?: string; provider?: string };
};

/** The page "make a contract": only for someone signed in. */
export function ContractNew(props: ContractNewProps) {
  const { lang, dict } = props;
  return (
    <AccountGate
      lang={lang}
      here={`/${lang}/contracts/new`}
      labels={dict.contracts.signInRequired}
      operatorNote={dict.contracts.operatorNote}
    >
      {(session) => <Target {...props} session={session} />}
    </AccountGate>
  );
}

function applicantOf(
  session: DemoSession,
  profile: ReturnType<typeof useProfiles>["profiles"][number] | undefined,
): ApplicantInfo {
  if (profile) {
    return {
      lastName: profile.lastName,
      firstName: profile.firstName,
      middleName: profile.middleName ?? "",
      iin: profile.iin,
      phone: profile.phone,
      email: profile.email ?? "",
    };
  }
  // The shared demo profile knows only a name: the rest the person fills in.
  const [lastName = "", ...rest] = session.name.split(" ");
  return { lastName, firstName: rest.join(" "), middleName: "", iin: "", phone: "", email: "" };
}

function Target({
  lang,
  dict,
  providers,
  missing,
  territories,
  preset,
  session,
}: ContractNewProps & { session: DemoSession }) {
  const router = useRouter();
  const ownerId = ownerIdOf(session);
  const { mine: properties } = useProperties(ownerId);
  const { profiles } = useProfiles();
  const { add } = useContracts(ownerId);
  const t = dict.contracts.target;
  const p = dict.properties;

  const fromCatalog = preset.service ? contractServiceBySlug(preset.service) : undefined;
  const confirmed = properties.filter(canOrderServices);
  const territoryName = (id: string) => territories.find((item) => item.id === id)?.name ?? "";
  const labelOf = (property: Property) =>
    addressLine(property, territoryName(property.territoryId), p.flat);

  const initialProperty =
    confirmed.find((item) => item.id === preset.property)?.id ??
    (confirmed.length === 1 ? confirmed[0].id : "");
  const [propertyId, setPropertyId] = useState(initialProperty);
  const [sector, setSector] = useState<ContractSector | "">(fromCatalog?.sector ?? "");
  const [providerId, setProviderId] = useState(
    (preset.provider && providers.some((item) => item.id === preset.provider) && preset.provider) ||
      fromCatalog?.providerId ||
      "",
  );
  const [errors, setErrors] = useState<{ property?: string; service?: string; provider?: string }>(
    {},
  );

  if (properties.length === 0 || confirmed.length === 0) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{t.noProperties.title}</h2>
        <p>{t.noProperties.text}</p>
        <div className={styles.actions}>
          <Button href={`/${lang}/properties/new`}>{t.noProperties.add}</Button>
          <Button variant="light" href={`/${lang}/properties`}>
            {t.noProperties.list}
          </Button>
        </div>
      </section>
    );
  }

  const property = confirmed.find((item) => item.id === propertyId);
  const services = property
    ? servicesAtAddress(
        {
          territoryId: property.territoryId,
          without: property.addressId ? (missing[property.addressId] ?? []) : [],
        },
        providers,
      )
    : [];
  const service = services.find((item) => item.sector === sector);
  const providerOptions = service && canOfferContract(service) ? service.providers : [];

  function chooseProperty(id: string) {
    setPropertyId(id);
    setErrors({});
    // A choice made for another address may not exist at this one.
    const next = confirmed.find((item) => item.id === id);
    const available = next
      ? servicesAtAddress(
          {
            territoryId: next.territoryId,
            without: next.addressId ? (missing[next.addressId] ?? []) : [],
          },
          providers,
        ).find((item) => item.sector === sector)
      : undefined;
    if (!available || !canOfferContract(available)) {
      setSector("");
      setProviderId("");
    } else if (!available.providers.some((item) => item.id === providerId)) {
      setProviderId(available.providers.length === 1 ? available.providers[0].id : "");
    }
  }

  function chooseSector(value: string) {
    setErrors({});
    const next = value as ContractSector | "";
    setSector(next);
    const found = services.find((item) => item.sector === next);
    setProviderId(found && found.providers.length === 1 ? found.providers[0].id : "");
  }

  function start() {
    const found: typeof errors = {};
    if (!property) found.property = t.errors.property;
    if (!service || !canOfferContract(service)) found.service = t.errors.service;
    const provider = providerOptions.find((item) => item.id === providerId);
    if (!provider) found.provider = t.errors.provider;
    setErrors(found);
    if (!property || !service || !provider) return;

    const draft = createDraft(
      {
        propertyId: property.id,
        sector: service.sector,
        serviceSlug: serviceSlugFor(service.sector, provider.id),
        serviceTitle: dict.contracts.sectorTitles[service.sector],
        providerId: provider.id,
        providerName: provider.name,
        applicant: applicantOf(
          session,
          profiles.find((item) => item.id === session.userId),
        ),
        address: labelOf(property),
        propertyType: property.type,
        basis: property.relation,
        personalAccount: property.personalAccount ?? "",
      },
      crypto.randomUUID(),
      ownerId,
      new Date(),
    );
    add(draft);
    router.replace(`/${lang}/contracts/${draft.id}`);
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.heading}>{t.title}</h2>

      <Field label={t.property} error={errors.property} required>
        {(control) => (
          <select
            {...control}
            value={propertyId}
            onChange={(event) => chooseProperty(event.target.value)}
          >
            <option value="">{t.propertyPlaceholder}</option>
            {properties.map((item) => (
              <option key={item.id} value={item.id} disabled={!canOrderServices(item)}>
                {canOrderServices(item)
                  ? labelOf(item)
                  : format(t.unconfirmed, { address: labelOf(item) })}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        label={t.service}
        hint={property ? undefined : t.pickPropertyFirst}
        error={errors.service}
        required
      >
        {(control) => (
          <select
            {...control}
            value={sector}
            disabled={!property}
            onChange={(event) => chooseSector(event.target.value)}
          >
            <option value="">{t.servicePlaceholder}</option>
            {CONTRACT_SECTORS.map((item) => {
              const found = services.find((entry) => entry.sector === item);
              const offered = found ? canOfferContract(found) : false;
              const name = dict.properties.detail.services.sectors[item];
              return (
                <option key={item} value={item} disabled={!offered}>
                  {offered ? name : format(t.unserved, { name })}
                </option>
              );
            })}
          </select>
        )}
      </Field>

      <Field label={t.provider} error={errors.provider} required>
        {(control) => (
          <select
            {...control}
            value={providerId}
            disabled={providerOptions.length === 0}
            onChange={(event) => {
              setProviderId(event.target.value);
              setErrors({});
            }}
          >
            <option value="">{t.providerPlaceholder}</option>
            {providerOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className={styles.actions}>
        <Button onClick={start}>{t.start}</Button>
      </div>
    </section>
  );
}
