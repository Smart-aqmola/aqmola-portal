import type { PhotoCredit } from "@/features/content/domain/types";
import styles from "./photo-credits.module.css";

type PhotoCreditsProps = {
  label: string;
  credits: readonly PhotoCredit[];
};

/** Author line required by the photo licence. Show it on every page that shows the photos. */
export function PhotoCredits({ label, credits }: PhotoCreditsProps) {
  if (credits.length === 0) return null;
  const license = credits[0].license;

  return (
    <p className={styles.credits}>
      {label}:{" "}
      {credits.map((credit, index) => (
        <span key={credit.sourceUrl}>
          {index > 0 && ", "}
          <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">
            {credit.author}
          </a>
        </span>
      ))}
      . Wikimedia Commons, {license}.
    </p>
  );
}
