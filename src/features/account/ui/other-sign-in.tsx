"use client";

import { useSession } from "@/features/applications/ui/use-session";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { Icon } from "@/shared/ui/icon/icon";
import { useToast } from "@/shared/ui/toast/toast-provider";
import styles from "./account.module.css";

type OtherSignInProps = {
  labels: Dictionary["signIn"]["other"];
};

/**
 * Sign in through eGov or with an electronic signature (spec 2.2). Not connected: the buttons
 * are in place so the screen is complete, and they say plainly that they do nothing yet.
 */
export function OtherSignIn({ labels }: OtherSignInProps) {
  const { session, ready } = useSession();
  const toast = useToast();
  if (!ready || session) return null;

  return (
    <section className={styles.card} aria-labelledby="other-sign-in-title">
      <div>
        <h2 id="other-sign-in-title" className={styles.heading}>
          {labels.title}
        </h2>
        <p className={styles.note}>{labels.text}</p>
      </div>
      <div className={styles.otherRow}>
        {[
          { id: "egov", text: labels.egov, icon: "user" as const },
          { id: "ecp", text: labels.ecp, icon: "files" as const },
        ].map((item) => (
          <Button
            key={item.id}
            variant="light"
            aria-disabled="true"
            onClick={() => toast.show(labels.soon)}
          >
            <Icon name={item.icon} size={18} />
            {item.text}
          </Button>
        ))}
      </div>
      <p className={styles.note}>{labels.soon}</p>
    </section>
  );
}
