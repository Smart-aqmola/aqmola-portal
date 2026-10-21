import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { Icon } from "@/shared/ui/icon/icon";
import styles from "./home-search.module.css";

type HomeSearchProps = {
  lang: Locale;
  labels: Dictionary["home"]["search"];
  territories: { id: string; name: string }[];
};

/**
 * A plain GET form: it works without JavaScript and opens the catalog with
 * ?q=…&territory=…&for=resident|business.
 */
export function HomeSearch({ lang, labels, territories }: HomeSearchProps) {
  return (
    <form
      className={styles.form}
      role="search"
      aria-label={labels.label}
      action={`/${lang}/services`}
      method="get"
    >
      <fieldset className={styles.audience}>
        <legend className="visually-hidden">{labels.audienceLabel}</legend>
        <label className={styles.option}>
          <input type="radio" name="for" value="resident" defaultChecked />
          <span>{labels.resident}</span>
        </label>
        <label className={styles.option}>
          <input type="radio" name="for" value="business" />
          <span>{labels.business}</span>
        </label>
      </fieldset>

      <div className={styles.finder}>
        <label className={styles.field}>
          <Icon name="search" />
          <span className="visually-hidden">{labels.queryLabel}</span>
          <input type="search" name="q" placeholder={labels.queryPlaceholder} autoComplete="off" />
        </label>
        <label className={styles.field}>
          <Icon name="pin" />
          <span className="visually-hidden">{labels.territoryLabel}</span>
          <select name="territory" defaultValue="" data-plain>
            <option value="">{labels.allTerritories}</option>
            {territories.map((territory) => (
              <option key={territory.id} value={territory.id}>
                {territory.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="light" size="lg" className={styles.submit}>
          {labels.submit}
        </Button>
      </div>
    </form>
  );
}
