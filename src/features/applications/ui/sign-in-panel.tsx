"use client";

import { useRouter } from "next/navigation";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { format } from "@/shared/i18n/format";
import { Button } from "@/shared/ui/button/button";
import { Icon } from "@/shared/ui/icon/icon";
import { useState } from "react";
import { DEMO_PROFILES, adminSession, operatorSession } from "../domain/storage";
import { useSession } from "./use-session";
import styles from "./panel.module.css";

type SignInPanelProps = {
  labels: Dictionary["signIn"];
  /** Where to go after choosing a profile; already checked on the server. */
  next: string;
  applicationsHref: string;
  operatorHref: string;
  adminHref: string;
  organizations: { id: string; name: string }[];
};

export function SignInPanel({
  labels,
  next,
  applicationsHref,
  operatorHref,
  adminHref,
  organizations,
}: SignInPanelProps) {
  const router = useRouter();
  const { session, ready, signIn, signOut } = useSession();

  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");

  function choose(role: "resident" | "business") {
    signIn(DEMO_PROFILES[role]);
    router.push(next);
  }

  function chooseOperator() {
    signIn(operatorSession(organizationId));
    router.push(operatorHref);
  }

  function chooseAdmin() {
    signIn(adminSession());
    router.push(adminHref);
  }

  if (!ready) return <div className={styles.placeholder} aria-hidden="true" />;

  return (
    <div className={styles.stack}>
      {session && (
        <section className={styles.notice} aria-live="polite">
          <p>{format(labels.signedAs, { name: session.name })}</p>
          <div className={styles.row}>
            <Button
              href={
                session.role === "operator"
                  ? operatorHref
                  : session.role === "admin"
                    ? adminHref
                    : applicationsHref
              }
            >
              {session.role === "operator"
                ? labels.toOperator
                : session.role === "admin"
                  ? labels.toAdmin
                  : labels.toApplications}
            </Button>
            <Button variant="ghost" onClick={signOut}>
              {labels.signOut}
            </Button>
          </div>
        </section>
      )}

      <ul className={styles.profiles}>
        {(["resident", "business"] as const).map((role) => (
          <li key={role} className={styles.profile}>
            <Icon name={role === "resident" ? "user" : "files"} size={28} />
            <h2 className={styles.profileTitle}>{labels[role].title}</h2>
            <p>{labels[role].text}</p>
            <Button
              variant={session?.role === role ? "light" : "primary"}
              onClick={() => choose(role)}
            >
              {session?.role === role ? labels.continue : labels[role].title}
            </Button>
          </li>
        ))}
        <li className={styles.profile}>
          <Icon name="chat" size={28} />
          <h2 className={styles.profileTitle}>{labels.operator.title}</h2>
          <p>{labels.operator.text}</p>
          <label className={styles.field}>
            {labels.operator.organization}
            <select
              className={styles.input}
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
            >
              {organizations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant={session?.role === "operator" ? "light" : "primary"}
            onClick={chooseOperator}
          >
            {labels.operator.title}
          </Button>
        </li>
        <li className={styles.profile}>
          <Icon name="doc" size={28} />
          <h2 className={styles.profileTitle}>{labels.admin.title}</h2>
          <p>{labels.admin.text}</p>
          <Button variant={session?.role === "admin" ? "light" : "primary"} onClick={chooseAdmin}>
            {labels.admin.title}
          </Button>
        </li>
      </ul>
      <p className={styles.note}>{labels.note}</p>
    </div>
  );
}
