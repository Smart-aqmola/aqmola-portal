import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { RequestsList } from "@/features/meters/ui/requests-list";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { pickDictionary } from "@/shared/i18n/pick-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/meters/requests">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.meters.nav.requests} — ${dict.brand.name}` };
}

export default async function MeterRequestsPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, territories] = await Promise.all([getDictionary(lang), loadTerritoryOptions(lang)]);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.meters.title}</h1>
      <p className={styles.lead}>{dict.meters.lead}</p>
      <div className={styles.narrow}>
        <RequestsList
          lang={lang}
          dict={pickDictionary(dict, "account", "contracts", "list", "meters", "properties")}
          territories={territories}
        />
      </div>
    </div>
  );
}
