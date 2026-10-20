import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { Icon } from "@/shared/ui/icon/icon";
import type { CatalogData } from "../load-catalog";
import styles from "./catalog-filters.module.css";

type CatalogFiltersProps = {
  lang: Locale;
  labels: Dictionary["catalog"];
  data: Pick<CatalogData, "params" | "situations" | "organizations" | "territories">;
};

/**
 * A plain GET form, so search and filters work without JavaScript and every result has its own
 * address. It is rebuilt when the address changes, so typed values never go stale.
 */
export function CatalogFilters({ lang, labels, data }: CatalogFiltersProps) {
  const { params } = data;
  const f = labels.filters;
  const key = JSON.stringify(params);

  return (
    <form
      key={key}
      className={styles.form}
      role="search"
      aria-label={labels.search.label}
      action={`/${lang}/services`}
      method="get"
    >
      {params.category && <input type="hidden" name="category" value={params.category} />}

      <fieldset className={styles.audience}>
        <legend className="visually-hidden">{f.audience}</legend>
        <label className={styles.option}>
          <input
            type="radio"
            name="for"
            value="resident"
            defaultChecked={params.audience === "resident"}
          />
          <span>{f.resident}</span>
        </label>
        <label className={styles.option}>
          <input
            type="radio"
            name="for"
            value="business"
            defaultChecked={params.audience === "business"}
          />
          <span>{f.business}</span>
        </label>
      </fieldset>

      <label className={styles.search}>
        <Icon name="search" />
        <span className="visually-hidden">{labels.search.queryLabel}</span>
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder={labels.search.queryPlaceholder}
          maxLength={100}
          autoComplete="off"
        />
      </label>

      <div className={styles.selects}>
        <label className={styles.select}>
          <span>{f.territory}</span>
          <select name="territory" defaultValue={params.territory ?? ""}>
            <option value="">{f.allTerritories}</option>
            {data.territories.map((territory) => (
              <option key={territory.id} value={territory.id}>
                {territory.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.select}>
          <span>{f.situation}</span>
          <select name="situation" defaultValue={params.situation ?? ""}>
            <option value="">{f.allSituations}</option>
            {data.situations.map((situation) => (
              <option key={situation.id} value={situation.id}>
                {situation.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.select}>
          <span>{f.organization}</span>
          <select name="organization" defaultValue={params.organization ?? ""}>
            <option value="">{f.allOrganizations}</option>
            {data.organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.actions}>
        <Button type="submit">{labels.search.submit}</Button>
        <Link href={`/${lang}/services`} className={styles.reset}>
          {f.reset}
        </Link>
      </div>
    </form>
  );
}
