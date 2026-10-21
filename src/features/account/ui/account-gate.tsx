"use client";

import type { ReactNode } from "react";
import { type DemoSession } from "@/features/applications/domain/storage";
import { useSession } from "@/features/applications/ui/use-session";
import type { Locale } from "@/shared/i18n/config";
import { Button } from "@/shared/ui/button/button";
import styles from "./account.module.css";

type AccountGateProps = {
  lang: Locale;
  /** Where to come back to after signing in; already a path inside this language. */
  here: string;
  labels: { title: string; text: string; button: string };
  operatorNote: string;
  children: (session: DemoSession) => ReactNode;
};

/**
 * Shows the page only to a signed-in resident or business. A guest is asked to sign in and brought
 * back; an operator is told this page is not for them. The real check is the backend's (spec 2.7).
 */
export function AccountGate({ lang, here, labels, operatorNote, children }: AccountGateProps) {
  const { session, ready } = useSession();

  if (!ready) return <div className={styles.placeholder} aria-hidden="true" />;

  if (!session) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{labels.title}</h2>
        <p>{labels.text}</p>
        <div>
          <Button href={`/${lang}/sign-in?next=${encodeURIComponent(here)}`}>
            {labels.button}
          </Button>
        </div>
      </section>
    );
  }

  if (session.role === "operator") {
    return (
      <section className={styles.card}>
        <p>{operatorNote}</p>
      </section>
    );
  }

  return <>{children(session)}</>;
}
