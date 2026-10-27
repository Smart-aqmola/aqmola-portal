"use client";

import { useRouter } from "next/navigation";
import { sameShapeAs, useDraftState } from "@/shared/lib/use-draft-state";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { DocumentKey } from "@/features/catalog/domain/service-details";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import {
  MAX_ADDRESS,
  MAX_COMMENT,
  canApply,
  createApplication,
  stepNames,
  validateStep,
  type ApplicationForm,
  type FormErrors,
  type StepName,
} from "../domain/application";
import { isStaffRole } from "@/features/session/domain/session";
import { useApplications } from "./use-applications";
import { useSession } from "@/features/session/ui/use-session";
import styles from "./panel.module.css";

export type ApplyService = {
  slug: string;
  title: string;
  organizationId: string;
  audience: "resident" | "business" | "both";
  documents: DocumentKey[];
};

type ApplyWizardProps = {
  lang: Locale;
  service: ApplyService;
  territories: { id: string; name: string }[];
  dict: Pick<Dictionary, "apply" | "signIn" | "serviceDetails" | "home">;
};

const EMPTY_FORM: ApplicationForm = {
  territoryId: "",
  address: "",
  attached: [],
  comment: "",
  consent: false,
};

export function ApplyWizard({ lang, service, territories, dict }: ApplyWizardProps) {
  const router = useRouter();
  const { session, ready } = useSession();
  const { add } = useApplications();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm, clearDraft] = useDraftState<ApplicationForm>(
    `apply-${service.slug}`,
    EMPTY_FORM,
    sameShapeAs(EMPTY_FORM),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // Move focus to the new step heading so keyboard and screen reader users notice the change.
  useEffect(() => {
    if (moved.current) heading.current?.focus();
    moved.current = true;
  }, [stepIndex]);

  const t = dict.apply;
  const step: StepName = stepNames[stepIndex];

  if (!ready) return <div className={styles.placeholder} aria-hidden="true" />;

  const audienceLabel = dict.home.service[service.audience];
  const applyPath = `/${lang}/services/${service.slug}/apply`;
  const signInHref = `/${lang}/sign-in?next=${encodeURIComponent(applyPath)}`;

  if (!session || isStaffRole(session.role)) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{t.signInRequired.title}</h2>
        <p>{t.signInRequired.text}</p>
        <div>
          <Button href={signInHref}>{t.signInRequired.button}</Button>
        </div>
      </section>
    );
  }

  if (!canApply(session.role, service.audience)) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{t.wrongRole.title}</h2>
        <p>{format(t.wrongRole.text, { audience: audienceLabel, name: session.name })}</p>
        <div>
          <Button href={signInHref}>{t.wrongRole.button}</Button>
        </div>
      </section>
    );
  }

  const owner = session;
  const territoryName = territories.find((item) => item.id === form.territoryId)?.name ?? "";
  const errorText = (key: keyof FormErrors) => {
    const code = errors[key];
    if (!code) return undefined;
    if (key === "consent") return t.errors.consent;
    return t.errors[code as keyof typeof t.errors];
  };

  function update(patch: Partial<ApplicationForm>) {
    setForm((current) => ({ ...current, ...patch }));
    setErrors({});
  }

  function toggleDocument(key: DocumentKey) {
    update({
      attached: form.attached.includes(key)
        ? form.attached.filter((item) => item !== key)
        : [...form.attached, key],
    });
  }

  function goNext() {
    const found = validateStep(step, form, service.documents);
    setErrors(found);
    if (Object.keys(found).length === 0) setStepIndex(stepIndex + 1);
  }

  function submit() {
    const found = validateStep("sign", form, service.documents);
    setErrors(found);
    if (Object.keys(found).length > 0 || isStaffRole(owner.role)) return;
    const created = add((number) =>
      createApplication({
        serviceSlug: service.slug,
        serviceTitle: service.title,
        organizationId: service.organizationId,
        ownerRole: owner.role as "resident" | "business",
        ownerName: owner.name,
        form,
        number,
        now: new Date(),
      }),
    );
    clearDraft();
    router.push(`/${lang}/applications/${created.number}?new=1`);
  }

  const isLast = stepIndex === stepNames.length - 1;

  return (
    <form
      className={styles.card}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (isLast) submit();
        else goNext();
      }}
    >
      <ol className={styles.progress} aria-label={t.progress}>
        {stepNames.map((name, index) => (
          <li key={name} aria-current={index === stepIndex ? "step" : undefined}>
            {index + 1}. {t.steps[name]}
          </li>
        ))}
      </ol>

      <p className={styles.hint}>
        {format(t.stepOf, { n: stepIndex + 1, total: stepNames.length })} · {t.applicant}:{" "}
        {session.name}
      </p>

      {step === "object" && (
        <>
          <h2 className={styles.heading} tabIndex={-1} ref={heading}>
            {t.object.title}
          </h2>
          <label className={styles.field}>
            {t.object.territory}
            <select
              className={styles.input}
              value={form.territoryId}
              aria-invalid={Boolean(errors.territoryId)}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                update({ territoryId: event.target.value })
              }
            >
              <option value="">{t.object.territoryPlaceholder}</option>
              {territories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {errorText("territoryId") && (
              <span className={styles.error} role="alert">
                {errorText("territoryId")}
              </span>
            )}
          </label>
          <label className={styles.field}>
            {t.object.address}
            <input
              className={styles.input}
              value={form.address}
              maxLength={MAX_ADDRESS + 20}
              aria-invalid={Boolean(errors.address)}
              onChange={(event) => update({ address: event.target.value })}
            />
            <span className={styles.hint}>{t.object.addressHint}</span>
            {errorText("address") && (
              <span className={styles.error} role="alert">
                {errorText("address")}
              </span>
            )}
          </label>
        </>
      )}

      {step === "documents" && (
        <>
          <h2 className={styles.heading} tabIndex={-1} ref={heading}>
            {t.documents.title}
          </h2>
          <p>{t.documents.lead}</p>
          {service.documents.length === 0 ? (
            <p>{t.documents.none}</p>
          ) : (
            <ul className={styles.docs}>
              {service.documents.map((key) => {
                const attached = form.attached.includes(key);
                return (
                  <li key={key} className={styles.doc}>
                    <span>{dict.serviceDetails.documents.items[key]}</span>
                    <Button
                      variant={attached ? "light" : "primary"}
                      aria-pressed={attached}
                      onClick={() => toggleDocument(key)}
                    >
                      {attached ? `✓ ${t.documents.attached}` : t.documents.attach}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          {errorText("attached") && (
            <p className={styles.error} role="alert">
              {errorText("attached")}
            </p>
          )}
        </>
      )}

      {step === "review" && (
        <>
          <h2 className={styles.heading} tabIndex={-1} ref={heading}>
            {t.review.title}
          </h2>
          <dl className={styles.summary}>
            <div>
              <dt>{t.service}</dt>
              <dd>{service.title}</dd>
            </div>
            <div>
              <dt>{t.review.territory}</dt>
              <dd>{territoryName}</dd>
            </div>
            <div>
              <dt>{t.review.address}</dt>
              <dd>{form.address.trim()}</dd>
            </div>
            <div>
              <dt>{t.review.documents}</dt>
              <dd>
                {form.attached.length === 0
                  ? "—"
                  : form.attached.map((key) => dict.serviceDetails.documents.items[key]).join(", ")}
              </dd>
            </div>
          </dl>
          <label className={styles.field}>
            {t.review.comment}
            <textarea
              className={styles.input}
              rows={3}
              value={form.comment}
              aria-invalid={Boolean(errors.comment)}
              onChange={(event) => update({ comment: event.target.value })}
            />
            <span className={styles.hint}>
              {format(t.review.commentHint, { max: MAX_COMMENT })}
            </span>
            {errorText("comment") && (
              <span className={styles.error} role="alert">
                {errorText("comment")}
              </span>
            )}
          </label>
        </>
      )}

      {step === "sign" && (
        <>
          <h2 className={styles.heading} tabIndex={-1} ref={heading}>
            {t.sign.title}
          </h2>
          <p>{t.sign.lead}</p>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(event) => update({ consent: event.target.checked })}
            />
            <span>{t.sign.consent}</span>
          </label>
          {errorText("consent") && (
            <p className={styles.error} role="alert">
              {errorText("consent")}
            </p>
          )}
        </>
      )}

      <div className={styles.actions}>
        {stepIndex > 0 ? (
          <Button variant="ghost" onClick={() => setStepIndex(stepIndex - 1)}>
            {t.back}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit">{isLast ? t.sign.submit : t.next}</Button>
      </div>
    </form>
  );
}
