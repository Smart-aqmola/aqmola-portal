import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadSituations } from "@/features/catalog/load-situation";
import { SituationTile } from "@/features/catalog/ui/situation-page";
import styles from "@/features/catalog/ui/situation-page.module.css";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import page from "@/shared/styles/page.module.css";

type Props = PageProps<"/[lang]/situations">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.situationPage.title} — ${dict.brand.name}` };
}

export default async function SituationsPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, situations] = await Promise.all([getDictionary(lang), loadSituations(lang)]);

  return (
    <div className={`container ${page.page}`}>
      <h1 className={page.title}>{dict.situationPage.title}</h1>
      <p className={page.lead}>{dict.situationPage.lead}</p>
      <ul className={`${styles.tiles} ${styles.index}`}>
        {situations.map((item) => (
          <li key={item.id}>
            <SituationTile lang={lang} labels={dict.situationPage} situation={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
