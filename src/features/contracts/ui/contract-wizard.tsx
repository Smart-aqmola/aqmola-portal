"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { useToast } from "@/shared/ui/toast/toast-provider";
import {
  applicantName,
  documentsAreValid,
  edited,
  readiness,
  signApplication,
  submitApplication,
  type ContractApplication,
} from "../domain/contract";
import { useContractRules } from "@/features/admin/ui/use-admin-config";
import { WizardApplication } from "./wizard-application";
import { WizardDocuments } from "./wizard-documents";
import { WizardReview } from "./wizard-review";
import { WizardSign } from "./wizard-sign";
import styles from "./contracts-styles";

const STEPS = ["application", "documents", "review", "sign"] as const;
type Step = (typeof STEPS)[number];

type ContractWizardProps = {
  app: ContractApplication;
  lang: Locale;
  dict: Pick<Dictionary, "contracts" | "properties">;
  onChange: (app: ContractApplication) => void;
  takeNumber: (now: Date) => string;
  /** Called after the application was sent and got its number. */
  onSent: (app: ContractApplication) => void;
};

/**
 * The steps after "object and service": application, documents, review, signing and sending
 * (spec 4.4). Every change is saved at once, so the person can leave and come back (18.4).
 */
export function ContractWizard({
  app,
  lang,
  dict,
  onChange,
  takeNumber,
  onSent,
}: ContractWizardProps) {
  const t = dict.contracts;
  const toast = useToast();
  const [step, setStep] = useState<Step>("application");
  const [tried, setTried] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [consentError, setConsentError] = useState(false);
  const stepBox = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  const rules = useContractRules();
  const check = readiness(app, new Date(), rules);
  const fieldsOk = Object.keys(check.fields).length === 0;
  const docsOk = documentsAreValid(check.documents);
  const index = STEPS.indexOf(step);

  // After a step change or a failed attempt, keyboard and screen reader users land on the right place.
  useEffect(() => {
    if (!moved.current) return;
    stepBox.current?.focus();
  }, [step]);
  useEffect(() => {
    if (attempt > 0) {
      stepBox.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [attempt]);

  function go(next: Step) {
    moved.current = true;
    setTried(false);
    setConsentError(false);
    setStep(next);
  }

  function change(patch: Partial<ContractApplication>) {
    onChange(edited(app, patch, new Date()));
  }

  function forward() {
    if (step === "application") {
      if (!fieldsOk) {
        setTried(true);
        setAttempt((value) => value + 1);
        return;
      }
      go("documents");
    } else if (step === "documents") {
      if (!docsOk) {
        setTried(true);
        setAttempt((value) => value + 1);
        return;
      }
      go("review");
    } else if (step === "review") {
      if (fieldsOk && docsOk) go("sign");
    }
  }

  function sign() {
    if (!app.consents.personalData || !app.consents.terms) {
      setConsentError(true);
      return;
    }
    const result = signApplication(app, applicantName(app.applicant), new Date(), rules);
    if (result.ok) onChange(result.application);
  }

  function send() {
    const now = new Date();
    const result = submitApplication(app, takeNumber(now), now, rules);
    if (!result.ok) return;
    onChange(result.application);
    toast.show(`${t.detail.number}: ${result.application.number}`);
    onSent(result.application);
  }

  const labels: Record<Step, string> = {
    application: t.steps.application,
    documents: t.steps.documents,
    review: t.steps.review,
    sign: t.steps.sign,
  };

  return (
    <section className={styles.card}>
      <div>
        <ol className={styles.progress} aria-label={t.steps.label}>
          <li data-done="true">{t.steps.target}</li>
          {STEPS.map((name) => (
            <li key={name} aria-current={name === step ? "step" : undefined}>
              {labels[name]}
            </li>
          ))}
        </ol>
        <p className={styles.note}>{format(t.stepOf, { n: index + 2, total: STEPS.length + 1 })}</p>
      </div>

      <div ref={stepBox} tabIndex={-1} className={styles.stepBox}>
        {step === "application" && (
          <WizardApplication
            app={app}
            errors={tried ? check.fields : {}}
            rules={rules}
            dict={dict}
            onChange={change}
          />
        )}
        {step === "documents" && (
          <WizardDocuments
            app={app}
            rules={rules}
            showMissing={tried}
            dict={dict}
            onChange={change}
          />
        )}
        {step === "review" && (
          <WizardReview app={app} lang={lang} dict={dict} readiness={check} onEdit={go} />
        )}
        {step === "sign" && (
          <WizardSign
            app={app}
            lang={lang}
            dict={dict}
            complete={fieldsOk && docsOk}
            showErrors={consentError}
            onConsents={(consents) => change({ consents })}
            onSign={sign}
            onSend={send}
          />
        )}
      </div>

      <div className={styles.actions}>
        {index > 0 && (
          <Button variant="ghost" onClick={() => go(STEPS[index - 1])}>
            {t.back}
          </Button>
        )}
        {step !== "sign" && (
          <Button onClick={forward} disabled={step === "review" && !(fieldsOk && docsOk)}>
            {t.next}
          </Button>
        )}
        <Button variant="light" onClick={() => toast.show(t.draftSaved)}>
          {t.saveDraft}
        </Button>
      </div>
      <p className={styles.note}>{t.draftSaved}</p>
    </section>
  );
}
