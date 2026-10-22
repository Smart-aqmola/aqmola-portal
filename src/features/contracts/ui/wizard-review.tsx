"use client";

import { maskIin } from "@/features/account/domain/iin";
import { formatPhone, normalizePhone } from "@/features/account/domain/phone";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { downloadText } from "@/shared/lib/download-text";
import { Button } from "@/shared/ui/button/button";
import {
  applicantName,
  documentsAreValid,
  type ContractApplication,
  type Readiness,
} from "../domain/contract";
import { applicationFileText, fileSize } from "./contract-texts";
import styles from "./contracts-styles";

type WizardReviewProps = {
  app: ContractApplication;
  lang: Locale;
  dict: Pick<Dictionary, "contracts" | "properties">;
  readiness: Readiness;
  /** Jump back to a step to change something there. */
  onEdit: (step: "application" | "documents") => void;
};

/** Step "review": everything the person entered, in one place, before it is signed (18.6). */
export function WizardReview({ app, lang, dict, readiness, onEdit }: WizardReviewProps) {
  const t = dict.contracts.review;
  const a = dict.contracts.application;
  const empty = t.empty;
  const fieldsOk = Object.keys(readiness.fields).length === 0;
  const docsOk = documentsAreValid(readiness.documents);
  const problems = [...(fieldsOk ? [] : [t.fieldsProblem]), ...(docsOk ? [] : [t.docsProblem])];
  const phone = normalizePhone(app.applicant.phone);

  return (
    <div className={styles.form}>
      <div>
        <h2 className={styles.heading}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>

      {problems.length > 0 && (
        <div className={styles.problems} role="alert">
          <p>{t.problems}</p>
          <ul>
            {problems.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
      )}

      <section className={styles.summary} aria-labelledby="review-applicant">
        <div className={styles.summaryHead}>
          <h3 id="review-applicant" className={styles.wayTitle}>
            {t.applicant}
          </h3>
          <button type="button" className={styles.remove} onClick={() => onEdit("application")}>
            {t.edit}
            <span className="visually-hidden"> — {t.applicant}</span>
          </button>
        </div>
        <dl className={styles.facts}>
          <div>
            <dt>{a.lastName}</dt>
            <dd>{applicantName(app.applicant) || empty}</dd>
          </div>
          <div>
            <dt>{a.iin}</dt>
            <dd>{app.applicant.iin ? maskIin(app.applicant.iin.replace(/\s/g, "")) : empty}</dd>
          </div>
          <div>
            <dt>{a.phone}</dt>
            <dd>{phone ? formatPhone(phone) : empty}</dd>
          </div>
          <div>
            <dt>{a.email}</dt>
            <dd>{app.applicant.email || empty}</dd>
          </div>
          <div>
            <dt>{a.notifyBy}</dt>
            <dd>{a.notify[app.notifyBy]}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.summary} aria-labelledby="review-object">
        <div className={styles.summaryHead}>
          <h3 id="review-object" className={styles.wayTitle}>
            {t.object}
          </h3>
          <button type="button" className={styles.remove} onClick={() => onEdit("application")}>
            {t.edit}
            <span className="visually-hidden"> — {t.object}</span>
          </button>
        </div>
        <dl className={styles.facts}>
          <div>
            <dt>{a.address}</dt>
            <dd>{app.address}</dd>
          </div>
          <div>
            <dt>{a.propertyType}</dt>
            <dd>{dict.properties.types[app.propertyType]}</dd>
          </div>
          <div>
            <dt>{a.basis}</dt>
            <dd>{dict.properties.relations[app.basis]}</dd>
          </div>
          <div>
            <dt>{a.personalAccount}</dt>
            <dd>{app.personalAccount || empty}</dd>
          </div>
          <div>
            <dt>{a.previousContract}</dt>
            <dd>{app.previousContract || empty}</dd>
          </div>
          <div>
            <dt>{t.meter}</dt>
            <dd>
              {app.meter.has
                ? `${app.meter.serial}${app.meter.reading ? `, ${app.meter.reading}` : ""}`
                : t.noMeter}
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.summary} aria-labelledby="review-service">
        <h3 id="review-service" className={styles.wayTitle}>
          {t.service}
        </h3>
        <dl className={styles.facts}>
          <div>
            <dt>{dict.contracts.detail.service}</dt>
            <dd>{app.serviceTitle}</dd>
          </div>
          <div>
            <dt>{dict.contracts.detail.provider}</dt>
            <dd>{app.providerName}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.summary} aria-labelledby="review-docs">
        <div className={styles.summaryHead}>
          <h3 id="review-docs" className={styles.wayTitle}>
            {t.documents}
          </h3>
          <button type="button" className={styles.remove} onClick={() => onEdit("documents")}>
            {t.edit}
            <span className="visually-hidden"> — {t.documents}</span>
          </button>
        </div>
        {app.attachments.length === 0 ? (
          <p className={styles.note}>{empty}</p>
        ) : (
          <ul className={styles.files}>
            {app.attachments.map((file) => (
              <li key={file.key} className={styles.file}>
                {dict.contracts.documents.names[file.key]}: {file.name} ·{" "}
                {fileSize(file.size, dict)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div>
        <Button
          variant="light"
          onClick={() => downloadText("zayavlenie.txt", applicationFileText(app, dict, lang))}
        >
          {t.download}
        </Button>
      </div>
    </div>
  );
}
