import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PropertyNew } from "@/features/account/ui/property-new";
import { loadAddressSuggestions } from "@/features/account/load-addresses";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs/breadcrumbs";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/properties/new">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.properties.form.title} — ${dict.brand.name}` };
}

export default async function NewPropertyPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, territories, suggestions] = await Promise.all([
    getDictionary(lang),
    loadTerritoryOptions(lang),
    loadAddressSuggestions(lang),
  ]);

  return (
    <div className={`container ${styles.page}`}>
      <Breadcrumbs
        label={dict.serviceDetails.breadcrumbs.label}
        items={[
          { label: dict.nav.home, href: `/${lang}` },
          { label: dict.properties.title, href: `/${lang}/properties` },
          { label: dict.properties.form.title },
        ]}
      />
      <h1 className={styles.title}>{dict.properties.form.title}</h1>
      <div className={styles.narrow}>
        <PropertyNew
          lang={lang}
          labels={dict.properties}
          territories={territories}
          suggestions={suggestions}
        />
      </div>
    </div>
  );
}
