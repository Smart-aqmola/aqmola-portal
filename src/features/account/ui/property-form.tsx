"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ownerIdOf, type DemoSession } from "@/features/applications/domain/storage";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { useToast } from "@/shared/ui/toast/toast-provider";
import type { AddressSuggestion } from "../domain/address-search";
import {
  MAX_HOUSE,
  MAX_OWNER_INFO,
  MAX_PLACE,
  createProperty,
  propertyTypes,
  relations,
  validateProperty,
  type PropertyErrors,
  type PropertyField,
  type PropertyInput,
} from "../domain/property";
import { AddressSearch } from "./address-search";
import { useProperties } from "./use-properties";
import styles from "./account.module.css";

type PropertyFormProps = {
  lang: Locale;
  session: DemoSession;
  labels: Dictionary["properties"];
  territories: { id: string; name: string }[];
  suggestions: readonly AddressSuggestion[];
};

const EMPTY: PropertyInput = {
  territoryId: "",
  locality: "",
  street: "",
  house: "",
  flat: "",
  type: "",
  relation: "",
  personalAccount: "",
  ownerInfo: "",
};

export function PropertyForm({
  lang,
  session,
  labels,
  territories,
  suggestions,
}: PropertyFormProps) {
  const router = useRouter();
  const toast = useToast();
  const { add } = useProperties(ownerIdOf(session));
  const [input, setInput] = useState<PropertyInput>(EMPTY);
  const [errors, setErrors] = useState<PropertyErrors>({});
  const [attempt, setAttempt] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const t = labels.form;

  // After a failed save, keyboard and screen reader users land on the first field to fix.
  useEffect(() => {
    if (attempt > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [attempt]);

  function update(patch: Partial<PropertyInput>) {
    setInput((current) => ({ ...current, ...patch }));
  }

  /** Typing over a place that came from the directory makes it a hand-written address. */
  function updatePlace(patch: Partial<PropertyInput>) {
    update({ ...patch, addressId: undefined });
  }

  function pick(item: AddressSuggestion) {
    update({
      territoryId: item.territoryId,
      locality: item.locality,
      street: item.street,
      addressId: item.id,
    });
    setErrors((current) => ({
      ...current,
      territoryId: undefined,
      locality: undefined,
      street: undefined,
    }));
  }

  function errorText(field: PropertyField): string | undefined {
    const code = errors[field];
    if (!code) return undefined;
    if (code === "long") return t.errors.long;
    if (code === "format") return field === "personalAccount" ? t.errors.account : t.errors.house;
    return t.errors.required;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateProperty(
      input,
      territories.map((item) => item.id),
    );
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setAttempt((value) => value + 1);
      return;
    }
    const property = createProperty(input, crypto.randomUUID(), ownerIdOf(session), new Date());
    add(property);
    toast.show(t.saved);
    router.push(`/${lang}/properties/${property.id}`);
  }

  return (
    <form ref={form} className={styles.card} onSubmit={submit} noValidate>
      <div>
        <h2 className={styles.heading}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>

      <AddressSearch suggestions={suggestions} labels={t} onSelect={pick} />

      <div className={styles.pair}>
        <Field label={t.region}>
          {(control) => <input {...control} value={t.regionValue} readOnly />}
        </Field>
        <Field label={t.territory} error={errorText("territoryId")} required>
          {(control) => (
            <select
              {...control}
              value={input.territoryId}
              onChange={(event) => updatePlace({ territoryId: event.target.value })}
            >
              <option value="">{t.territoryPlaceholder}</option>
              {territories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <div className={styles.pair}>
        <Field label={t.locality} error={errorText("locality")} required>
          {(control) => (
            <input
              {...control}
              value={input.locality}
              maxLength={MAX_PLACE + 10}
              autoComplete="address-level2"
              onChange={(event) => updatePlace({ locality: event.target.value })}
            />
          )}
        </Field>
        <Field label={t.street} error={errorText("street")} required>
          {(control) => (
            <input
              {...control}
              value={input.street}
              maxLength={MAX_PLACE + 10}
              autoComplete="address-line1"
              onChange={(event) => updatePlace({ street: event.target.value })}
            />
          )}
        </Field>
      </div>

      <div className={styles.pair}>
        <Field label={t.house} error={errorText("house")} required>
          {(control) => (
            <input
              {...control}
              value={input.house}
              maxLength={MAX_HOUSE + 5}
              onChange={(event) => update({ house: event.target.value })}
            />
          )}
        </Field>
        <Field label={t.flat} error={errorText("flat")} required={input.type === "apartment"}>
          {(control) => (
            <input
              {...control}
              value={input.flat}
              maxLength={MAX_HOUSE + 5}
              onChange={(event) => update({ flat: event.target.value })}
            />
          )}
        </Field>
      </div>

      <div className={styles.pair}>
        <Field label={t.type} error={errorText("type")} required>
          {(control) => (
            <select
              {...control}
              value={input.type}
              onChange={(event) => update({ type: event.target.value as PropertyInput["type"] })}
            >
              <option value="">{t.typePlaceholder}</option>
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {labels.types[type]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t.relation} error={errorText("relation")} required>
          {(control) => (
            <select
              {...control}
              value={input.relation}
              onChange={(event) => {
                const relation = event.target.value as PropertyInput["relation"];
                // The owner is usually the person themselves, so save them the typing.
                update({
                  relation,
                  ...(relation === "owner" && !input.ownerInfo.trim()
                    ? { ownerInfo: session.name }
                    : {}),
                });
              }}
            >
              <option value="">{t.relationPlaceholder}</option>
              {relations.map((relation) => (
                <option key={relation} value={relation}>
                  {labels.relations[relation]}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <Field label={t.owner} hint={t.ownerHint} error={errorText("ownerInfo")} required>
        {(control) => (
          <input
            {...control}
            value={input.ownerInfo}
            maxLength={MAX_OWNER_INFO + 10}
            onChange={(event) => update({ ownerInfo: event.target.value })}
          />
        )}
      </Field>

      <Field label={t.account} hint={t.accountHint} error={errorText("personalAccount")}>
        {(control) => (
          <input
            {...control}
            value={input.personalAccount}
            inputMode="numeric"
            autoComplete="off"
            maxLength={20}
            onChange={(event) => update({ personalAccount: event.target.value })}
          />
        )}
      </Field>

      <div className={styles.actions}>
        <Button type="submit">{t.submit}</Button>
        <Button variant="ghost" href={`/${lang}/properties`}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
