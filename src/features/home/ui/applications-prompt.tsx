import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { Card } from "@/shared/ui/card/card";
import styles from "./applications-prompt.module.css";

type ApplicationsPromptProps = {
  lang: Locale;
  labels: Dictionary["home"]["applications"];
};

/** Invitation to the personal part of the portal, with the three statuses an application goes through. */
export function ApplicationsPrompt({ lang, labels }: ApplicationsPromptProps) {
  const statuses = [
    ["submitted", labels.statuses.submitted],
    ["review", labels.statuses.inReview],
    ["done", labels.statuses.completed],
  ] as const;

  return (
    <Card as="section" padding="lg" className={styles.card}>
      <h2 className={styles.title}>{labels.title}</h2>
      <p className={styles.text}>{labels.text}</p>
      <ul className={styles.statuses}>
        {statuses.map(([kind, label]) => (
          <li key={kind} className={styles.status} data-kind={kind}>
            {label}
          </li>
        ))}
      </ul>
      <Button href={`/${lang}/applications`}>{labels.button}</Button>
    </Card>
  );
}
