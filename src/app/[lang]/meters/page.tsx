import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { MyMeters } from "@/features/meters/ui/my-meters";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { pickDictionary } from "@/shared/i18n/pick-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/meters">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.meters.title} — ${dict.brand.name}` };
}

export default async function MetersPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, territories] = await Promise.all([getDictionary(lang), loadTerritoryOptions(lang)]);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.meters.title}</h1>
      <p className={styles.lead}>{dict.meters.lead}</p>
      <div className={styles.narrow}>
        <MyMeters
          lang={lang}
          dict={pickDictionary(dict, "account", "contracts", "list", "meters", "properties")}
          territories={territories}
        />
      </div>
    </div>
  );
}
