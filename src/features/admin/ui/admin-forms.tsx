"use client";

import { useState } from "react";
import { relations } from "@/features/account/domain/property";
import { documentKeys } from "@/features/contracts/domain/contract";
import type { Locale } from "@/shared/i18n/config";
import { Button } from "@/shared/ui/button/button";
import { CheckField } from "@/shared/ui/field/field";
import { DEFAULT_CONFIG, optionalFields, type AdminConfig } from "../domain/config";
import { AdminArea, type AdminContext, type AdminDict } from "./admin-area";
import styles from "./admin.module.css";

type Props = { lang: Locale; dict: AdminDict };

/** The simple designer of the application form: required documents and fields (spec 13.2, 20.3). */
export function AdminForms(props: Props) {
  return (
    <AdminArea lang={props.lang} dict={props.dict} current="forms">
      {(context) => <Forms {...props} context={context} />}
    </AdminArea>
  );
}

function Forms({ dict, context }: Props & { context: AdminContext }) {
  const t = dict.admin.forms;
  const [draft, setDraft] = useState<AdminConfig>(context.config);

  const toggle = <T,>(list: readonly T[], item: T, on: boolean): T[] =>
    on ? [...list, item] : list.filter((entry) => entry !== item);

  return (
    <>
      <div>
        <h2 className={styles.sectionTitle}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>
      <h3 className={styles.boxTitle}>{t.documents}</h3>
      <div className={styles.form}>
        {relations.map((relation) => (
          <div
            key={relation}
            role="group"
            aria-label={dict.properties.relations[relation]}
            className={styles.group}
          >
            <h4 className={styles.legend}>{dict.properties.relations[relation]}</h4>
            <div className={styles.checks}>
              {documentKeys.map((key) => (
                <CheckField
                  key={key}
                  label={dict.contracts.documents.names[key]}
                  checked={draft.documents[relation].includes(key)}
                  onChange={(on) =>
                    setDraft({
                      ...draft,
                      documents: {
                        ...draft.documents,
                        [relation]: toggle(draft.documents[relation], key, on),
                      },
                    })
                  }
                />
              ))}
            </div>
            {draft.documents[relation].length === 0 && <p className={styles.note}>{t.none}</p>}
          </div>
        ))}
      </div>
      <div role="group" aria-label={t.fields} className={styles.group}>
        <h3 className={styles.legend}>{t.fields}</h3>
        <div className={styles.checks}>
          {optionalFields.map((field) => (
            <CheckField
              key={field}
              label={t.fieldNames[field]}
              checked={draft.requiredFields.includes(field)}
              onChange={(on) =>
                setDraft({ ...draft, requiredFields: toggle(draft.requiredFields, field, on) })
              }
            />
          ))}
        </div>
      </div>
      <div className={styles.actions}>
        <Button onClick={() => context.save(draft, "forms")}>{dict.admin.save}</Button>
        <Button
          variant="light"
          onClick={() => {
            const reset = {
              ...draft,
              documents: DEFAULT_CONFIG.documents,
              requiredFields: DEFAULT_CONFIG.requiredFields,
            };
            setDraft(reset);
            context.save(reset, "forms");
          }}
        >
          {dict.admin.reset}
        </Button>
      </div>
    </>
  );
}
