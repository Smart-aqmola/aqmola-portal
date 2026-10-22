"use client";

import { useState, type FormEvent } from "react";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { useToast } from "@/shared/ui/toast/toast-provider";
import {
  MAX_CHANGE_TEXT,
  changeKinds,
  isConcluded,
  requestChange,
  type ChangeKind,
  type ContractApplication,
} from "../domain/contract";
import { formatStamp } from "./contract-texts";
import styles from "./contracts-styles";

type ChangeRequestProps = {
  app: ContractApplication;
  lang: Locale;
  dict: Pick<Dictionary, "contracts">;
  onChange: (app: ContractApplication) => void;
};

/** Asks to change the data of a contract in force (spec 5.6) and lists what was asked before. */
export function ChangeRequest({ app, lang, dict, onChange }: ChangeRequestProps) {
  const t = dict.contracts.change;
  const toast = useToast();
  const [kind, setKind] = useState<ChangeKind>("contacts");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const requests = app.changeRequests ?? [];

  if (!isConcluded(app.status)) {
    return (
      <section className={styles.card} aria-labelledby="change-title">
        <h2 id="change-title" className={styles.heading}>
          {t.title}
        </h2>
        <p className={styles.note}>{t.unavailable}</p>
      </section>
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = requestChange(app, { kind, text }, crypto.randomUUID(), new Date());
    if (!result.ok) {
      setError(
        result.reason === "too_many"
          ? t.errors.many
          : format(t.errors.text, { max: MAX_CHANGE_TEXT }),
      );
      return;
    }
    onChange(result.application);
    setText("");
    setError(undefined);
    toast.show(t.sent);
  }

  return (
    <section className={styles.card} aria-labelledby="change-title">
      <div>
        <h2 id="change-title" className={styles.heading}>
          {t.title}
        </h2>
        <p className={styles.note}>{t.lead}</p>
      </div>

      <form className={styles.form} onSubmit={submit} noValidate>
        <Field label={t.kind}>
          {(control) => (
            <select
              {...control}
              value={kind}
              onChange={(event) => setKind(event.target.value as ChangeKind)}
            >
              {changeKinds.map((item) => (
                <option key={item} value={item}>
                  {t.kinds[item]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          label={t.text}
          hint={format(t.textHint, { max: MAX_CHANGE_TEXT })}
          error={error}
          required
        >
          {(control) => (
            <textarea
              {...control}
              rows={3}
              value={text}
              maxLength={MAX_CHANGE_TEXT + 50}
              onChange={(event) => {
                setText(event.target.value);
                setError(undefined);
              }}
            />
          )}
        </Field>
        <div>
          <Button type="submit">{t.submit}</Button>
        </div>
      </form>

      {requests.length > 0 && (
        <div>
          <h3 className={styles.wayTitle}>{t.listTitle}</h3>
          <ul className={styles.changes}>
            {requests.map((request) => (
              <li key={request.id} className={styles.change}>
                <span className={styles.badge} data-tone="work">
                  {t.status[request.status]}
                </span>
                <span>
                  {t.kinds[request.kind]}: {request.text}
                </span>
                <span className={styles.note}>{formatStamp(request.at, lang)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
