import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountNav } from "@/features/account/ui/account-nav";
import { PropertiesList } from "@/features/account/ui/properties-list";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/properties">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.properties.title} — ${dict.brand.name}` };
}

export default async function PropertiesPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, territories] = await Promise.all([getDictionary(lang), loadTerritoryOptions(lang)]);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.properties.title}</h1>
      <p className={styles.lead}>{dict.properties.lead}</p>
      <div className={styles.narrow}>
        <AccountNav lang={lang} labels={dict.account.nav} current="properties" />
        <PropertiesList lang={lang} labels={dict.properties} territories={territories} />
      </div>
    </div>
  );
}
