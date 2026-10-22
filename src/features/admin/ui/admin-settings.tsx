"use client";

import { useState } from "react";
import { contractStatuses } from "@/features/contracts/domain/contract";
import { requestStatuses } from "@/features/meters/domain/meter-request";
import { readingStatuses } from "@/features/meters/domain/reading";
import { appealStatuses } from "@/features/appeals/domain/appeal";
import { paymentStatuses } from "@/features/billing/domain/payment";
import { registryKinds } from "@/features/registry/domain/registry";
import { locales, type Locale } from "@/shared/i18n/config";
import { Button } from "@/shared/ui/button/button";
import { CheckField, Field } from "@/shared/ui/field/field";
import { DEFAULT_CONFIG, MAX_DAYS, MIN_DAYS, type AdminConfig } from "../domain/config";
import { AdminArea, type AdminContext, type AdminDict } from "./admin-area";
import styles from "./admin-styles";

type Props = { lang: Locale; dict: AdminDict };

/** Terms for the register of requests, the languages of the interface, access to sums (spec 13.2, 17.4, 18.9). */
export function AdminSettings(props: Props) {
  return (
    <AdminArea lang={props.lang} dict={props.dict} current="settings">
      {(context) => <Settings {...props} context={context} />}
    </AdminArea>
  );
}

function Settings({ dict, context }: Props & { context: AdminContext }) {
  const t = dict.admin.settings;
  const [draft, setDraft] = useState<AdminConfig>(context.config);
  const [texts, setTexts] = useState<Record<string, string>>(
    Object.fromEntries(
      registryKinds.map((kind) => [kind, String(context.config.regulationDays[kind])]),
    ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function save() {
    const found: Record<string, string> = {};
    const days = { ...draft.regulationDays };
    for (const kind of registryKinds) {
      const value = Number(texts[kind]);
      if (!/^\d{1,2}$/.test(texts[kind].trim()) || value < MIN_DAYS || value > MAX_DAYS)
        found[kind] = t.days.error;
      else days[kind] = value;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    context.save({ ...draft, regulationDays: days }, "settings");
  }

  const lists: [string, readonly string[], Record<string, string>][] = [
    [t.statuses.contract, contractStatuses, dict.contracts.status],
    [t.statuses.reading, readingStatuses, dict.meters.status],
    [t.statuses.request, requestStatuses, dict.meters.requestStatus],
    [t.statuses.payment, paymentStatuses, dict.billing.status],
    [t.statuses.appeal, appealStatuses, dict.appeals.status],
  ];

  return (
    <>
      <div>
        <h2 className={styles.sectionTitle}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>

      <div role="group" aria-label={t.days.title} className={styles.group}>
        <h3 className={styles.legend}>{t.days.title}</h3>
        <div className={styles.pair}>
          {registryKinds.map((kind) => (
            <Field
              key={kind}
              label={t.days.kinds[kind]}
              hint={t.days.hint}
              error={errors[kind]}
              required
            >
              {(control) => (
                <input
                  {...control}
                  className={`${control.className} ${styles.numberInput}`}
                  inputMode="numeric"
                  value={texts[kind]}
                  onChange={(event) => setTexts({ ...texts, [kind]: event.target.value })}
                />
              )}
            </Field>
          ))}
        </div>
      </div>

      <div role="group" aria-label={t.languages.title} className={styles.group}>
        <h3 className={styles.legend}>{t.languages.title}</h3>
        <div className={styles.checks}>
          {locales.map((locale) => (
            <CheckField
              key={locale}
              label={locale === "ru" ? `${t.languages.ru} *` : t.languages[locale]}
              checked={draft.languages.includes(locale)}
              onChange={(on) => {
                if (locale === "ru") return;
                setDraft({
                  ...draft,
                  languages: on
                    ? [...draft.languages, locale]
                    : draft.languages.filter((item) => item !== locale),
                });
              }}
            />
          ))}
        </div>
        <p className={styles.note}>{t.languages.hint}</p>
      </div>

      <div role="group" aria-label={t.finance.title} className={styles.group}>
        <h3 className={styles.legend}>{t.finance.title}</h3>
        <CheckField
          label={t.finance.label}
          checked={draft.financeAccess}
          onChange={(on) => setDraft({ ...draft, financeAccess: on })}
        />
        <p className={styles.note}>{t.finance.hint}</p>
      </div>

      <div className={styles.actions}>
        <Button onClick={save}>{dict.admin.save}</Button>
        <Button
          variant="light"
          onClick={() => {
            const reset = {
              ...draft,
              languages: DEFAULT_CONFIG.languages,
              regulationDays: DEFAULT_CONFIG.regulationDays,
              financeAccess: DEFAULT_CONFIG.financeAccess,
            };
            setDraft(reset);
            setTexts(
              Object.fromEntries(
                registryKinds.map((kind) => [kind, String(reset.regulationDays[kind])]),
              ),
            );
            setErrors({});
            context.save(reset, "settings");
          }}
        >
          {dict.admin.reset}
        </Button>
      </div>

      <h3 className={styles.boxTitle}>{t.statuses.title}</h3>
      <p className={styles.note}>{t.statuses.lead}</p>
      <div className={styles.form}>
        {lists.map(([title, keys, names]) => (
          <details key={title} className={styles.details}>
            <summary>{title}</summary>
            <ol>
              {keys.map((key) => (
                <li key={key}>{names[key]}</li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </>
  );
}
