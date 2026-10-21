import type { Dictionary } from "@/shared/i18n/get-dictionary";
import styles from "./faq.module.css";

type FaqProps = { labels: Dictionary["help"] };

/** In the order a newcomer needs them: register, confirm the object, contract, then the rest. */
const ORDER = [
  "register",
  "object",
  "contract",
  "address",
  "readings",
  "pay",
  "recalc",
  "test",
] as const;

/** Questions and answers (spec 1.1, "help and frequently asked questions"). */
export function Faq({ labels }: FaqProps) {
  return (
    <div className={styles.list}>
      {ORDER.map((key) => (
        <details key={key} className={styles.item}>
          <summary className={styles.question}>{labels.items[key].q}</summary>
          <p className={styles.answer}>{labels.items[key].a}</p>
        </details>
      ))}
    </div>
  );
}
