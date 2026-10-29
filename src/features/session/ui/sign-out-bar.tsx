"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { Button } from "@/shared/ui/button/button";
import { useSession } from "./use-session";
import styles from "./sign-out-bar.module.css";

type SignOutBarProps = {
  lang: Locale;
  labels: { signedAs: string; signOut: string };
};

/** Who is signed in and the way out, at the top of every cabinet. Signing out leads home. */
export function SignOutBar({ lang, labels }: SignOutBarProps) {
  const router = useRouter();
  const { session, signOut } = useSession();
  if (!session) return null;

  function leave() {
    signOut();
    router.push(`/${lang}`);
  }

  return (
    <div className={styles.bar}>
      <p className={styles.who}>{format(labels.signedAs, { name: session.name })}</p>
      <Button variant="ghost" onClick={leave}>
        {labels.signOut}
      </Button>
    </div>
  );
}
