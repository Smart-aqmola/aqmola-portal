import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Icon } from "@/shared/ui/icon/icon";
import { catalogHref, type CatalogParams } from "../domain/catalog-params";
import type { CatalogData } from "../load-catalog";
import { categoryIcons } from "./icons";
import styles from "./category-chips.module.css";

type CategoryChipsProps = {
  lang: Locale;
  labels: Dictionary["catalog"]["categories"];
  params: CatalogParams;
  categories: CatalogData["categories"];
};

/** Categories with the number of services each would show under the other filters. */
export function CategoryChips({ lang, labels, params, categories }: CategoryChipsProps) {
  const base: Partial<CatalogParams> = { ...params, category: undefined, page: 1 };
  const total = categories.reduce((sum, category) => sum + category.count, 0);

  return (
    <nav aria-label={labels.label}>
      <ul className={styles.list}>
        <li>
          <Link
            href={catalogHref(lang, base)}
            className={styles.chip}
            aria-current={params.category ? undefined : "true"}
          >
            <span>{labels.all}</span>
            <span className={styles.count}>{total}</span>
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={catalogHref(lang, { ...base, category: category.id })}
              className={styles.chip}
              aria-current={params.category === category.id ? "true" : undefined}
              data-empty={category.count === 0}
            >
              <Icon name={categoryIcons[category.id]} size={18} />
              <span>{category.name}</span>
              <span className={styles.count}>{category.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
