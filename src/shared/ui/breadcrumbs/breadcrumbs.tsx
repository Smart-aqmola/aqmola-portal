import Link from "next/link";
import styles from "./breadcrumbs.module.css";

type Crumb = { label: string; href?: string };

/** Only a long title may be cut with an ellipsis on a narrow screen; short words keep their size. */
const LONG_LABEL = 16;

type BreadcrumbsProps = {
  label: string;
  items: Crumb[];
};

/** Where the visitor is. The last item is the current page and is not a link. */
export function Breadcrumbs({ label, items }: BreadcrumbsProps) {
  return (
    <nav aria-label={label} className={styles.nav}>
      <ol className={styles.list}>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li
              key={`${index}-${item.label}`}
              className={
                item.label.length > LONG_LABEL ? `${styles.item} ${styles.long}` : styles.item
              }
            >
              {item.href && !last ? (
                <Link href={item.href} className={styles.link}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
