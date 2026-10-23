import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Icon, type IconName } from "@/shared/ui/icon/icon";
import type { SurveyCategory } from "../domain/types";
import type { SurveyCardData } from "../load-surveys";
import styles from "./surveys.module.css";

export const categoryIcons: Record<SurveyCategory, IconName> = {
  utilities: "heat",
  city: "house",
  ecology: "tree",
  digital: "online",
  tourism: "pin",
};

type Labels = Dictionary["surveysPage"];

export function timeLeftText(survey: Pick<SurveyCardData, "left">, labels: Labels): string {
  return survey.left ? format(labels.left[survey.left.unit], { n: survey.left.n }) : labels.closed;
}

/** A survey card (as on astana.kz/surveys): time left, title, summary, category, participants. */
export function SurveyCard({
  survey,
  lang,
  labels,
}: {
  survey: SurveyCardData;
  lang: Locale;
  labels: Labels;
}) {
  return (
    <article className={styles.card}>
      <div className={styles.cover} data-category={survey.category}>
        <Icon name={categoryIcons[survey.category]} size={44} strokeWidth={1.2} />
        <span className={styles.left} data-open={survey.open}>
          <Icon name="clock" size={14} />
          {timeLeftText(survey, labels)}
        </span>
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link href={`/${lang}/surveys/${survey.slug}`} className={styles.link}>
            {survey.title}
          </Link>
        </h3>
        <p className={styles.summary}>{survey.summary}</p>
        <p className={styles.meta}>
          <span className={styles.tag}>{labels.categories[survey.category]}</span>
          <span>
            <Icon name="user" size={14} /> {format(labels.participants, { n: survey.participants })}
          </span>
        </p>
      </div>
    </article>
  );
}
