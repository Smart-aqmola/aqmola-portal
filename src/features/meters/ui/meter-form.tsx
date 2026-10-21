"use client";

import { useState } from "react";
import type { Property } from "@/features/account/domain/property";
import { format } from "@/shared/i18n/format";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { useToast } from "@/shared/ui/toast/toast-provider";
import {
  DECIMAL_CHOICES,
  DIGIT_CHOICES,
  createMeter,
  emptyMeterInput,
  meterResources,
  meterTypes,
  validateMeter,
  type Meter,
  type MeterErrors,
  type MeterField,
  type MeterInput,
} from "../domain/meter";
import { Group } from "./group";
import type { MetersDict } from "./meters-area";
import styles from "./meters.module.css";

type MeterFormProps = {
  dict: MetersDict;
  properties: Property[];
  labelOf: (property: Property) => string;
  ownerId: string;
  existing: readonly Meter[];
  /** The object the person came from, if any. */
  propertyId?: string;
  onSave: (meter: Meter) => void;
  onCancel: () => void;
};

/** The form "add a meter" (spec 6.5): resource, serial number, first reading and what the passport says. */
export function MeterForm({
  dict,
  properties,
  labelOf,
  ownerId,
  existing,
  propertyId: preset,
  onSave,
  onCancel,
}: MeterFormProps) {
  const t = dict.meters.my.form;
  const toast = useToast();
  const initial =
    properties.find((item) => item.id === preset)?.id ??
    (properties.length === 1 ? properties[0].id : "");
  const [propertyId, setPropertyId] = useState(initial);
  const [input, setInput] = useState<MeterInput>(() =>
    emptyMeterInput(properties.find((item) => item.id === initial)?.personalAccount ?? ""),
  );
  const [errors, setErrors] = useState<MeterErrors>({});
  const [propertyError, setPropertyError] = useState<string>();

  const set = (patch: Partial<MeterInput>) => setInput((current) => ({ ...current, ...patch }));

  function choose(id: string) {
    setPropertyId(id);
    setPropertyError(undefined);
    const account = properties.find((item) => item.id === id)?.personalAccount;
    if (account && !input.personalAccount) set({ personalAccount: account });
  }

  function message(field: MeterField): string | undefined {
    const code = errors[field];
    if (!code) return undefined;
    if (field === "initialReading") {
      const key = code as keyof typeof dict.meters.valueErrors;
      return format(dict.meters.valueErrors[key], {
        digits: input.digits,
        decimals: input.decimals,
      });
    }
    return t.errors[code as keyof typeof t.errors];
  }

  function save() {
    const found = validateMeter(
      input,
      new Date(),
      existing.filter((item) => item.ownerId === ownerId),
    );
    const property = properties.find((item) => item.id === propertyId);
    setErrors(found);
    setPropertyError(property ? undefined : dict.meters.request.errors.property);
    if (!property || Object.keys(found).length > 0) return;
    onSave(
      createMeter(
        input,
        { id: crypto.randomUUID(), ownerId, propertyId: property.id, address: labelOf(property) },
        new Date(),
      ),
    );
    toast.show(t.saved);
  }

  const text = (field: MeterField, hint?: string, required = false) => (
    <Field label={t.fields[field]} hint={hint} error={message(field)} required={required}>
      {(control) => (
        <input
          {...control}
          value={input[field]}
          onChange={(event) => set({ [field]: event.target.value })}
        />
      )}
    </Field>
  );

  const date = (field: MeterField, required = false) => (
    <Field label={t.fields[field]} error={message(field)} required={required}>
      {(control) => (
        <input
          {...control}
          type="date"
          value={input[field]}
          onChange={(event) => set({ [field]: event.target.value })}
        />
      )}
    </Field>
  );

  return (
    <section className={styles.card} aria-labelledby="meter-form-title">
      <div>
        <h2 id="meter-form-title" className={styles.heading}>
          {t.title}
        </h2>
        <p className={styles.note}>{t.lead}</p>
      </div>

      <div className={styles.form}>
        <Field label={dict.meters.common.property} error={propertyError} required>
          {(control) => (
            <select
              {...control}
              value={propertyId}
              onChange={(event) => choose(event.target.value)}
            >
              <option value="">{dict.meters.common.propertyPlaceholder}</option>
              {properties.map((item) => (
                <option key={item.id} value={item.id}>
                  {labelOf(item)}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Group title={t.groups.main}>
          <div className={styles.pair}>
            <Field label={t.fields.resource} error={message("resource")} required>
              {(control) => (
                <select
                  {...control}
                  value={input.resource}
                  onChange={(event) =>
                    set({ resource: event.target.value as MeterInput["resource"] })
                  }
                >
                  <option value="">{t.choose}</option>
                  {meterResources.map((item) => (
                    <option key={item} value={item}>
                      {dict.meters.resources[item]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t.fields.type} error={message("type")} required>
              {(control) => (
                <select
                  {...control}
                  value={input.type}
                  onChange={(event) => set({ type: event.target.value as MeterInput["type"] })}
                >
                  <option value="">{t.choose}</option>
                  {meterTypes.map((item) => (
                    <option key={item} value={item}>
                      {dict.meters.types[item]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <div className={styles.pair}>
            {text("manufacturer")}
            {text("model")}
          </div>
          <div className={styles.pair}>
            {text("serial", t.hints.serial, true)}
            {text("personalAccount", t.hints.personalAccount)}
          </div>
        </Group>

        <Group title={t.groups.dates}>
          <div className={styles.pair}>
            {date("installedAt", true)}
            {date("commissionedAt")}
            {date("lastVerifiedAt")}
            {date("nextVerificationAt")}
          </div>
        </Group>

        <Group title={t.groups.seal}>
          <div className={styles.pair}>
            {text("sealNumber")}
            {date("sealedAt")}
          </div>
        </Group>

        <Group title={t.groups.dials}>
          <div className={styles.pair}>
            <Field label={t.fields.digits} hint={t.hints.digits}>
              {(control) => (
                <select
                  {...control}
                  value={input.digits}
                  onChange={(event) => set({ digits: event.target.value })}
                >
                  {DIGIT_CHOICES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t.fields.decimals}>
              {(control) => (
                <select
                  {...control}
                  value={input.decimals}
                  onChange={(event) => set({ decimals: event.target.value })}
                >
                  {DECIMAL_CHOICES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <Field
            label={t.fields.initialReading}
            hint={t.hints.initialReading}
            error={message("initialReading")}
            required
          >
            {(control) => (
              <input
                {...control}
                inputMode="decimal"
                value={input.initialReading}
                onChange={(event) => set({ initialReading: event.target.value })}
              />
            )}
          </Field>
        </Group>
      </div>

      <div className={styles.actions}>
        <Button onClick={save}>{t.save}</Button>
        <Button variant="light" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </section>
  );
}
