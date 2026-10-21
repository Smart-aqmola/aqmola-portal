"use client";

import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { downloadText } from "@/shared/lib/download-text";
import { Button } from "@/shared/ui/button/button";
import { CheckField } from "@/shared/ui/field/field";
import type { ContractApplication } from "../domain/contract";
import { contractFileText, formatStamp } from "./contract-texts";
import styles from "./contracts.module.css";

type WizardSignProps = {
  app: ContractApplication;
  lang: Locale;
  dict: Pick<Dictionary, "contracts" | "properties">;
  /** True when the fields and the documents are right, so signing makes sense. */
  complete: boolean;
  /** Show the consent error; false until the person tried to send. */
  showErrors: boolean;
  onConsents: (consents: ContractApplication["consents"]) => void;
  onSign: () => void;
  onSend: () => void;
};

/** Step "sign": the text of the contract, two consents, the demo signature and sending (4.12–4.14). */
export function WizardSign({
  app,
  lang,
  dict,
  complete,
  showErrors,
  onConsents,
  onSign,
  onSend,
}: WizardSignProps) {
  const t = dict.contracts.sign;
  const signature = app.signatures.application;
  const consentsGiven = app.consents.personalData && app.consents.terms;
  const text = contractFileText(app, dict, lang);
  const consentError = showErrors && !consentsGiven ? t.errors.consents : undefined;

  return (
    <div className={styles.form}>
      <div>
        <h2 className={styles.heading}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>

      <div className={styles.way}>
        <h3 id="contract-text-title" className={styles.wayTitle}>
          {t.textTitle}
        </h3>
        <div
          className={styles.contractText}
          tabIndex={0}
          role="region"
          aria-labelledby="contract-text-title"
        >
          {text.split("\n\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div>
          <Button variant="light" onClick={() => downloadText("dogovor.txt", text)}>
            {t.download}
          </Button>
        </div>
      </div>

      <div className={styles.consents}>
        <CheckField
          label={t.consentData}
          checked={app.consents.personalData}
          onChange={(personalData) => onConsents({ ...app.consents, personalData })}
          error={consentError}
        />
        <CheckField
          label={t.consentTerms}
          checked={app.consents.terms}
          onChange={(terms) => onConsents({ ...app.consents, terms })}
        />
      </div>

      <section aria-labelledby="ecp-title" className={styles.way}>
        <h3 id="ecp-title" className={styles.wayTitle}>
          {t.ecpTitle}
        </h3>
        <p className={styles.demo}>{t.ecpText}</p>
        {signature ? (
          <p className={styles.signed}>
            {format(t.signed, { name: signature.name, at: formatStamp(signature.at, lang) })}
          </p>
        ) : (
          <div>
            <Button variant="light" onClick={onSign} disabled={!complete}>
              {t.signApplication}
            </Button>
            {!complete && <p className={styles.note}>{t.notReady}</p>}
          </div>
        )}
      </section>

      <div className={styles.actions}>
        <Button onClick={onSend} disabled={!signature}>
          {t.send}
        </Button>
      </div>
      {!signature && <p className={styles.note}>{t.mustSign}</p>}
    </div>
  );
}
