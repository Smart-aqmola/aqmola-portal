"use client";

import type { ChangeEvent } from "react";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { MAX_FILES, MAX_FILE_BYTES, megabytes } from "@/shared/lib/upload-rules";
import { Field } from "@/shared/ui/field/field";
import {
  requiredDocuments,
  validateDocuments,
  type Attachment,
  type ContractApplication,
  type ContractDocumentKey,
} from "../domain/contract";
import { fileSize } from "./contract-texts";
import styles from "./contracts.module.css";

type WizardDocumentsProps = {
  app: ContractApplication;
  /** Show "not attached" messages; false until the person tried to go on. */
  showMissing: boolean;
  dict: Pick<Dictionary, "contracts" | "properties">;
  onChange: (patch: { attachments: Attachment[] }) => void;
};

/** Step "documents": one slot for each required document (4.3), with the file checked at once (4.7). */
export function WizardDocuments({ app, showMissing, dict, onChange }: WizardDocumentsProps) {
  const t = dict.contracts.documents;
  const required = requiredDocuments(app.basis);
  const found = validateDocuments(app);

  function problemOf(key: ContractDocumentKey): string | undefined {
    const file = app.attachments.find((item) => item.key === key);
    const problem = found.problems.find((item) => item.key === key)?.problem;
    if (!file || !problem) return undefined;
    return format(t.errors[problem], { name: file.name, size: megabytes(MAX_FILE_BYTES) });
  }

  function attach(key: ContractDocumentKey, event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    // Clear the field so the same file can be picked again after it was removed.
    event.target.value = "";
    if (!picked) return;
    const others = app.attachments.filter((item) => item.key !== key);
    onChange({ attachments: [...others, { key, name: picked.name, size: picked.size }] });
  }

  function remove(key: ContractDocumentKey) {
    onChange({ attachments: app.attachments.filter((item) => item.key !== key) });
  }

  return (
    <div className={styles.form}>
      <div>
        <h2 className={styles.heading}>{t.title}</h2>
        <p className={styles.note}>{format(t.lead, { size: megabytes(MAX_FILE_BYTES) })}</p>
        <p className={styles.note}>{t.hint}</p>
      </div>

      <ul className={styles.docs}>
        {required.map((key) => {
          const file = app.attachments.find((item) => item.key === key);
          const problem = problemOf(key);
          const missing = !file && showMissing;
          return (
            <li key={key} className={styles.doc}>
              <Field
                label={`${t.names[key]} · ${t.required}`}
                error={
                  problem ??
                  (missing ? format(t.errors.missing, { name: t.names[key] }) : undefined)
                }
                required
              >
                {(control) => (
                  <input
                    {...control}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) => attach(key, event)}
                  />
                )}
              </Field>
              {file ? (
                <p className={styles.attached}>
                  <span>
                    {format(t.attached, { name: file.name, size: fileSize(file.size, dict) })}
                  </span>
                  <button type="button" className={styles.remove} onClick={() => remove(key)}>
                    {format(t.remove, { name: file.name })}
                  </button>
                </p>
              ) : (
                <p className={styles.note}>{t.missing}</p>
              )}
            </li>
          );
        })}
      </ul>

      {found.tooMany && (
        <p className={styles.error} role="alert">
          {format(t.errors.many, { count: MAX_FILES })}
        </p>
      )}
    </div>
  );
}
