"use client";

import { useState } from "react";
import {
  notificationEvents,
  type NotificationEvent,
} from "@/features/notifications/domain/notifications";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { MAX_TEMPLATE, type AdminConfig, type Templates } from "../domain/config";
import { AdminArea, type AdminContext, type AdminDict } from "./admin-area";
import styles from "./admin.module.css";

type Props = {
  lang: Locale;
  dict: AdminDict;
  /** The standard text of every event in Russian and Kazakh, so the administrator sees what is replaced. */
  defaults: Record<"ru" | "kk", Record<string, string>>;
};

/** The texts of notifications in Russian and Kazakh (spec 16.5). */
export function AdminTemplates(props: Props) {
  return (
    <AdminArea lang={props.lang} dict={props.dict} current="templates">
      {(context) => <Templates {...props} context={context} />}
    </AdminArea>
  );
}

const LANGS = ["ru", "kk"] as const;

function Templates({ dict, defaults, context }: Props & { context: AdminContext }) {
  const t = dict.admin.templates;
  const [texts, setTexts] = useState<Templates>(context.config.templates);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (lang: (typeof LANGS)[number], event: NotificationEvent, value: string) =>
    setTexts((current) => {
      const next = { ...current[lang] };
      if (value.trim()) next[event] = value;
      else delete next[event];
      return { ...current, [lang]: next };
    });

  function save() {
    const found: Record<string, string> = {};
    for (const lang of LANGS) {
      for (const event of notificationEvents) {
        if ((texts[lang][event] ?? "").length > MAX_TEMPLATE)
          found[`${lang}.${event}`] = format(t.tooLong, { max: MAX_TEMPLATE });
      }
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const next: AdminConfig = { ...context.config, templates: texts };
    context.save(next, "templates");
  }

  return (
    <>
      <div>
        <h2 className={styles.sectionTitle}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
        <p className={styles.mono}>{t.placeholders}</p>
      </div>
      <ul className={styles.items}>
        {notificationEvents.map((event) => (
          <li key={event} className={styles.templateRow}>
            <strong className={styles.mono}>{event}</strong>
            {LANGS.map((lang) => (
              <Field
                key={lang}
                label={`${t[lang]}: ${event}`}
                hint={`${t.default}: ${defaults[lang][event] ?? ""}`}
                error={errors[`${lang}.${event}`]}
              >
                {(control) => (
                  <textarea
                    {...control}
                    rows={2}
                    lang={lang === "kk" ? "kk" : "ru"}
                    value={texts[lang][event] ?? ""}
                    onChange={(e) => set(lang, event, e.target.value)}
                  />
                )}
              </Field>
            ))}
            <div>
              <Button
                variant="ghost"
                onClick={() => {
                  set("ru", event, "");
                  set("kk", event, "");
                }}
              >
                {t.reset}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <Button onClick={save}>{dict.admin.save}</Button>
      </div>
    </>
  );
}
