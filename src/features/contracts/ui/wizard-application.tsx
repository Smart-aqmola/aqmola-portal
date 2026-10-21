"use client";

import { useId, type ReactNode } from "react";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { CheckField, Field } from "@/shared/ui/field/field";
import {
  DEFAULT_RULES,
  notifyChannels,
  type ApplicationErrors,
  type ApplicationField,
  type ContractApplication,
  type ContractRules,
} from "../domain/contract";
import styles from "./contracts.module.css";

type WizardApplicationProps = {
  app: ContractApplication;
  /** Errors to show; empty until the person tried to go on. */
  errors: ApplicationErrors;
  /** What the administrator made required on top of the basics (spec 13.2). */
  rules?: ContractRules;
  dict: Pick<Dictionary, "contracts" | "properties">;
  onChange: (patch: Partial<ContractApplication>) => void;
};

/** A titled group of fields; the title names the group for screen readers. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className={styles.group}>
      <h3 id={id} className={styles.legend}>
        {title}
      </h3>
      {children}
    </div>
  );
}

/** Step "application": the fields of the specification (4.5), filled from the profile and the object. */
export function WizardApplication({
  app,
  errors,
  rules = DEFAULT_RULES,
  dict,
  onChange,
}: WizardApplicationProps) {
  const t = dict.contracts.application;
  const a = app.applicant;

  function errorText(field: ApplicationField): string | undefined {
    const code = errors[field];
    if (!code) return undefined;
    if (code === "required") return t.errors.required;
    if (code === "long") return t.errors.long;
    switch (field) {
      case "lastName":
      case "firstName":
      case "middleName":
        return t.errors.name;
      case "iin":
        return t.errors.iin;
      case "phone":
        return t.errors.phone;
      case "email":
        return code === "needed" ? t.errors.emailNeeded : t.errors.email;
      case "rightSince":
        return t.errors.date;
      case "personalAccount":
        return t.errors.account;
      case "meterSerial":
        return t.errors.meter;
      case "meterReading":
        return t.errors.reading;
      default:
        return t.errors.required;
    }
  }

  const setApplicant = (patch: Partial<ContractApplication["applicant"]>) =>
    onChange({ applicant: { ...a, ...patch } });

  return (
    <div className={styles.form}>
      <div>
        <h2 className={styles.heading}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>

      <Group title={t.applicantTitle}>
        <div className={styles.pair}>
          <Field label={t.lastName} error={errorText("lastName")} required>
            {(control) => (
              <input
                {...control}
                value={a.lastName}
                autoComplete="family-name"
                maxLength={70}
                onChange={(event) => setApplicant({ lastName: event.target.value })}
              />
            )}
          </Field>
          <Field label={t.firstName} error={errorText("firstName")} required>
            {(control) => (
              <input
                {...control}
                value={a.firstName}
                autoComplete="given-name"
                maxLength={70}
                onChange={(event) => setApplicant({ firstName: event.target.value })}
              />
            )}
          </Field>
        </div>
        <Field label={t.middleName} error={errorText("middleName")}>
          {(control) => (
            <input
              {...control}
              value={a.middleName}
              autoComplete="additional-name"
              maxLength={70}
              onChange={(event) => setApplicant({ middleName: event.target.value })}
            />
          )}
        </Field>
        <div className={styles.pair}>
          <Field label={t.iin} error={errorText("iin")} required>
            {(control) => (
              <input
                {...control}
                value={a.iin}
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                onChange={(event) => setApplicant({ iin: event.target.value })}
              />
            )}
          </Field>
          <Field label={t.phone} error={errorText("phone")} required>
            {(control) => (
              <input
                {...control}
                type="tel"
                value={a.phone}
                autoComplete="tel"
                maxLength={22}
                onChange={(event) => setApplicant({ phone: event.target.value })}
              />
            )}
          </Field>
        </div>
        <Field
          label={t.email}
          error={errorText("email")}
          required={rules.requiredFields.includes("email")}
        >
          {(control) => (
            <input
              {...control}
              type="email"
              value={a.email}
              autoComplete="email"
              maxLength={110}
              onChange={(event) => setApplicant({ email: event.target.value })}
            />
          )}
        </Field>
      </Group>

      <Group title={t.objectTitle}>
        <Field label={t.address}>
          {(control) => <input {...control} value={app.address} readOnly />}
        </Field>
        <div className={styles.pair}>
          <Field label={t.propertyType}>
            {(control) => (
              <input {...control} value={dict.properties.types[app.propertyType]} readOnly />
            )}
          </Field>
          <Field label={t.basis}>
            {(control) => (
              <input {...control} value={dict.properties.relations[app.basis]} readOnly />
            )}
          </Field>
        </div>
        <div className={styles.pair}>
          <Field
            label={t.rightSince}
            hint={t.rightSinceHint}
            error={errorText("rightSince")}
            required={rules.requiredFields.includes("rightSince")}
          >
            {(control) => (
              <input
                {...control}
                type="date"
                value={app.rightSince}
                onChange={(event) => onChange({ rightSince: event.target.value })}
              />
            )}
          </Field>
          <Field
            label={t.personalAccount}
            error={errorText("personalAccount")}
            required={rules.requiredFields.includes("personalAccount")}
          >
            {(control) => (
              <input
                {...control}
                value={app.personalAccount}
                inputMode="numeric"
                autoComplete="off"
                maxLength={20}
                onChange={(event) => onChange({ personalAccount: event.target.value })}
              />
            )}
          </Field>
        </div>
        <Field
          label={t.previousContract}
          hint={t.previousContractHint}
          error={errorText("previousContract")}
        >
          {(control) => (
            <input
              {...control}
              value={app.previousContract}
              maxLength={110}
              onChange={(event) => onChange({ previousContract: event.target.value })}
            />
          )}
        </Field>
      </Group>

      <Group title={t.meterTitle}>
        <CheckField
          label={t.hasMeter}
          checked={app.meter.has}
          onChange={(has) => onChange({ meter: { ...app.meter, has } })}
        />
        {app.meter.has && (
          <div className={styles.pair}>
            <Field label={t.meterSerial} error={errorText("meterSerial")} required>
              {(control) => (
                <input
                  {...control}
                  value={app.meter.serial}
                  maxLength={40}
                  onChange={(event) =>
                    onChange({ meter: { ...app.meter, serial: event.target.value } })
                  }
                />
              )}
            </Field>
            <Field label={t.meterReading} error={errorText("meterReading")}>
              {(control) => (
                <input
                  {...control}
                  value={app.meter.reading}
                  inputMode="decimal"
                  maxLength={20}
                  onChange={(event) =>
                    onChange({ meter: { ...app.meter, reading: event.target.value } })
                  }
                />
              )}
            </Field>
          </div>
        )}
      </Group>

      <Group title={t.notifyTitle}>
        <Field label={t.notifyBy} error={undefined}>
          {(control) => (
            <select
              {...control}
              value={app.notifyBy}
              onChange={(event) =>
                onChange({ notifyBy: event.target.value as ContractApplication["notifyBy"] })
              }
            >
              {notifyChannels.map((channel) => (
                <option key={channel} value={channel}>
                  {t.notify[channel]}
                </option>
              ))}
            </select>
          )}
        </Field>
      </Group>
    </div>
  );
}
