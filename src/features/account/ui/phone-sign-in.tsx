"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { residentSession } from "@/features/applications/domain/storage";
import { useSession } from "@/features/applications/ui/use-session";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { useToast } from "@/shared/ui/toast/toast-provider";
import { CODE_LENGTH, DEMO_CODE, isCodeCorrect } from "../domain/otp";
import { normalizePhone } from "../domain/phone";
import { displayName, findByPhone, type Profile } from "../domain/profile";
import { useProfiles } from "./use-profiles";
import styles from "./account.module.css";

type PhoneSignInProps = {
  labels: Dictionary["signIn"]["phone"];
  /** Where to go after signing in; already checked on the server. */
  next: string;
  signUpHref: string;
};

/** Sign in with the phone number and the one-time code (spec 2.2). The code is a demo constant. */
export function PhoneSignIn({ labels, next, signUpHref }: PhoneSignInProps) {
  const router = useRouter();
  const toast = useToast();
  const { session, ready, signIn } = useSession();
  const { profiles } = useProfiles();
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<"format" | "unknown" | null>(null);
  const [found, setFound] = useState<Profile | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (found) codeInput.current?.focus();
  }, [found]);

  // Someone who is already in does not need this form; the panel below offers to continue.
  if (!ready || session) return null;

  function submitPhone(event: FormEvent) {
    event.preventDefault();
    if (!normalizePhone(phone)) {
      setPhoneError("format");
      return;
    }
    const profile = findByPhone(profiles, phone);
    if (!profile) {
      setPhoneError("unknown");
      return;
    }
    setPhoneError(null);
    setFound(profile);
  }

  function submitCode(event: FormEvent) {
    event.preventDefault();
    if (!found) return;
    if (!isCodeCorrect(code)) {
      setCodeError(true);
      return;
    }
    signIn(residentSession(found.id, displayName(found)));
    toast.show(format(labels.welcome, { name: displayName(found) }));
    router.push(next);
  }

  return (
    <section className={styles.card} aria-labelledby="phone-sign-in-title">
      <div>
        <h2 id="phone-sign-in-title" className={styles.heading}>
          {labels.title}
        </h2>
        <p className={styles.note}>{labels.text}</p>
      </div>

      {found ? (
        <form className={styles.form} onSubmit={submitCode} noValidate>
          <p className={styles.demo}>{format(labels.codeText, { code: DEMO_CODE })}</p>
          <Field label={labels.code} error={codeError ? labels.wrongCode : undefined} required>
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
            <Button type="submit">{labels.submit}</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setFound(null);
                setCode("");
                setCodeError(false);
              }}
            >
              {labels.change}
            </Button>
          </div>
        </form>
      ) : (
        <form className={styles.form} onSubmit={submitPhone} noValidate>
          <Field
            label={labels.phone}
            error={
              phoneError === "format"
                ? labels.phoneError
                : phoneError === "unknown"
                  ? labels.notFound
                  : undefined
            }
            required
          >
            {(control) => (
              <input
                {...control}
                type="tel"
                value={phone}
                autoComplete="tel"
                maxLength={22}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setPhoneError(null);
                }}
              />
            )}
          </Field>
          <div className={styles.actions}>
            <Button type="submit">{labels.getCode}</Button>
          </div>
          <p className={styles.alt}>
            {labels.noAccount} <Link href={signUpHref}>{labels.register}</Link>
          </p>
        </form>
      )}
    </section>
  );
}
