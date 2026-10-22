"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { sameShapeAs, useDraftState } from "@/shared/lib/use-draft-state";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { residentSession } from "@/features/applications/domain/storage";
import { useSession } from "@/features/applications/ui/use-session";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { CheckField, Field } from "@/shared/ui/field/field";
import { useToast } from "@/shared/ui/toast/toast-provider";
import { CODE_LENGTH, DEMO_CODE, isCodeCorrect } from "../domain/otp";
import { formatPhone, normalizePhone } from "../domain/phone";
import {
  MAX_EMAIL,
  MAX_NAME,
  createProfile,
  displayName,
  validateRegistration,
  type RegistrationErrors,
  type RegistrationField,
  type RegistrationInput,
} from "../domain/profile";
import { useProfiles } from "./use-profiles";
import styles from "./account-styles";

type SignUpFormProps = {
  labels: Dictionary["signUp"];
  /** Where to go once the cabinet exists; already checked on the server. */
  next: string;
  signInHref: string;
};

const EMPTY: RegistrationInput = {
  lastName: "",
  firstName: "",
  middleName: "",
  iin: "",
  phone: "",
  email: "",
  consent: false,
};

type Step = "data" | "code";

export function SignUpForm({ labels, next, signInHref }: SignUpFormProps) {
  const router = useRouter();
  const toast = useToast();
  const { profiles, add } = useProfiles();
  const { signIn } = useSession();
  const [step, setStep] = useState<Step>("data");
  const [input, setInput, clearDraft] = useDraftState<RegistrationInput>(
    "sign-up",
    EMPTY,
    sameShapeAs(EMPTY),
  );
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const moved = useRef(false);

  // After a failed send, keyboard and screen reader users land on the first field to fix.
  useEffect(() => {
    if (attempt > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [attempt]);

  useEffect(() => {
    if (step === "code" && moved.current) codeInput.current?.focus();
  }, [step]);

  function update(patch: Partial<RegistrationInput>) {
    setInput((current) => ({ ...current, ...patch }));
  }

  function errorText(field: RegistrationField): string | undefined {
    const code = errors[field];
    if (!code) return undefined;
    const t = labels.errors;
    if (code === "required") return field === "consent" ? t.consent : t.required;
    if (code === "long") return t.long;
    if (field === "iin") return code === "taken" ? t.iinTaken : t.iin;
    if (field === "phone") return code === "taken" ? t.phoneTaken : t.phone;
    if (field === "email") return t.email;
    return t.name;
  }

  function submitData(event: FormEvent) {
    event.preventDefault();
    const found = validateRegistration(input, profiles);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setAttempt((value) => value + 1);
      return;
    }
    moved.current = true;
    setStep("code");
  }

  function submitCode(event: FormEvent) {
    event.preventDefault();
    if (!isCodeCorrect(code)) {
      setCodeError(true);
      return;
    }
    const profile = createProfile(input, crypto.randomUUID(), new Date());
    add(profile);
    clearDraft();
    signIn(residentSession(profile.id, displayName(profile)));
    toast.show(format(labels.done, { name: displayName(profile) }));
    router.push(next);
  }

  const steps = [
    { id: "data", label: labels.steps.data },
    { id: "code", label: labels.steps.code },
  ] as const;

  return (
    <section className={styles.card}>
      <ol className={styles.progress} aria-label={labels.steps.label}>
        {steps.map((item) => (
          <li key={item.id} aria-current={item.id === step ? "step" : undefined}>
            {item.label}
          </li>
        ))}
      </ol>

      {step === "data" ? (
        <form ref={form} className={styles.form} onSubmit={submitData} noValidate>
          <div className={styles.pair}>
            <Field label={labels.fields.lastName} error={errorText("lastName")} required>
              {(control) => (
                <input
                  {...control}
                  value={input.lastName}
                  autoComplete="family-name"
                  maxLength={MAX_NAME + 10}
                  onChange={(event) => update({ lastName: event.target.value })}
                />
              )}
            </Field>
            <Field label={labels.fields.firstName} error={errorText("firstName")} required>
              {(control) => (
                <input
                  {...control}
                  value={input.firstName}
                  autoComplete="given-name"
                  maxLength={MAX_NAME + 10}
                  onChange={(event) => update({ firstName: event.target.value })}
                />
              )}
            </Field>
          </div>
          <Field label={labels.fields.middleName} error={errorText("middleName")}>
            {(control) => (
              <input
                {...control}
                value={input.middleName}
                autoComplete="additional-name"
                maxLength={MAX_NAME + 10}
                onChange={(event) => update({ middleName: event.target.value })}
              />
            )}
          </Field>
          <Field
            label={labels.fields.iin}
            hint={labels.fields.iinHint}
            error={errorText("iin")}
            required
          >
            {(control) => (
              <input
                {...control}
                value={input.iin}
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                onChange={(event) => update({ iin: event.target.value })}
              />
            )}
          </Field>
          <Field
            label={labels.fields.phone}
            hint={labels.fields.phoneHint}
            error={errorText("phone")}
            required
          >
            {(control) => (
              <input
                {...control}
                type="tel"
                value={input.phone}
                autoComplete="tel"
                maxLength={22}
                onChange={(event) => update({ phone: event.target.value })}
              />
            )}
          </Field>
          <Field label={labels.fields.email} error={errorText("email")}>
            {(control) => (
              <input
                {...control}
                type="email"
                value={input.email}
                autoComplete="email"
                maxLength={MAX_EMAIL + 10}
                onChange={(event) => update({ email: event.target.value })}
              />
            )}
          </Field>
          <CheckField
            label={labels.consent}
            checked={input.consent}
            error={errorText("consent")}
            onChange={(consent) => update({ consent })}
          />
          <div className={styles.actions}>
            <Button type="submit">{labels.getCode}</Button>
          </div>
          <p className={styles.alt}>
            {labels.haveAccount} <Link href={signInHref}>{labels.signIn}</Link>
          </p>
        </form>
      ) : (
        <form className={styles.form} onSubmit={submitCode} noValidate>
          <h2 className={styles.heading}>{labels.codeTitle}</h2>
          <p className={styles.demo}>
            {format(labels.codeText, {
              phone: formatPhone(normalizePhone(input.phone) ?? input.phone),
              code: DEMO_CODE,
            })}
          </p>
          <Field label={labels.code} error={codeError ? labels.codeWrong : undefined} required>
            {(control) => (
              <input
                {...control}
                ref={codeInput}
                value={code}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH + 2}
                onChange={(event) => {
                  setCode(event.target.value);
                  setCodeError(false);
                }}
              />
            )}
          </Field>
          <div className={styles.actions}>
            <Button type="submit">{labels.confirm}</Button>
            <Button variant="ghost" onClick={() => setStep("data")}>
              {labels.change}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
