import Link from "next/link";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { format } from "@/shared/i18n/format";
import { Icon } from "@/shared/ui/icon/icon";
import { paginationItems } from "./pagination-items";
import styles from "./pagination.module.css";

type PaginationProps = {
  page: number;
  pageCount: number;
  labels: Dictionary["catalog"]["pagination"];
  /** Address of another page of the same search. */
  hrefFor: (page: number) => string;
};

export function Pagination({ page, pageCount, labels, hrefFor }: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label={labels.label} className={styles.nav}>
      <ul className={styles.list}>
        <li>
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              className={styles.step}
              rel="prev"
              aria-label={labels.prev}
            >
              <Icon name="next" size={18} className={styles.back} />
              <span>{labels.prev}</span>
            </Link>
          ) : (
            <span className={styles.step} aria-disabled="true" data-disabled="true">
              <Icon name="next" size={18} className={styles.back} />
              <span>{labels.prev}</span>
            </span>
          )}
        </li>

        {paginationItems(page, pageCount).map((item) =>
          item.type === "gap" ? (
            <li key={item.key} className={styles.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item.page}>
              <Link
                href={hrefFor(item.page)}
                className={styles.number}
                aria-label={format(labels.page, { n: item.page })}
                aria-current={item.page === page ? "page" : undefined}
              >
                {item.page}
              </Link>
            </li>
          ),
        )}

        <li>
          {page < pageCount ? (
            <Link
              href={hrefFor(page + 1)}
              className={styles.step}
              rel="next"
              aria-label={labels.next}
            >
              <span>{labels.next}</span>
              <Icon name="next" size={18} />
            </Link>
          ) : (
            <span className={styles.step} aria-disabled="true" data-disabled="true">
              <span>{labels.next}</span>
              <Icon name="next" size={18} />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
