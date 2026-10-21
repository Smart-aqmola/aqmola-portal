import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadMissingNetworks, loadProviders } from "@/features/account/load-providers";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { AppealsList } from "@/features/appeals/ui/appeals-list";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/appeals">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.appeals.title} — ${dict.brand.name}` };
}

export default async function AppealsPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, territories, providers] = await Promise.all([
    getDictionary(lang),
    loadTerritoryOptions(lang),
    loadProviders(lang),
  ]);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.appeals.title}</h1>
      <p className={styles.lead}>{dict.appeals.lead}</p>
      <div className={styles.narrow}>
        <AppealsList
          lang={lang}
          dict={dict}
          territories={territories}
          providers={providers}
          missing={loadMissingNetworks()}
        />
      </div>
    </div>
  );
}
