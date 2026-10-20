import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalogRepository } from "@/features/catalog/data";
import { hasLocale, locales } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { localize } from "@/shared/i18n/localized";
import { Button } from "@/shared/ui/button/button";
import newsStyles from "@/features/content/ui/news.module.css";
import styles from "@/shared/styles/page.module.css";

type Props = PageProps<"/[lang]/about">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.aboutPage.title} — ${dict.brand.name}` };
}

export default async function AboutPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, territories] = await Promise.all([
    getDictionary(lang),
    getCatalogRepository().listTerritories(),
  ]);
  const t = dict.aboutPage;
  const names = (kind: "city" | "district") =>
    territories.filter((item) => item.kind === kind).map((item) => localize(item.name, lang));
  const cities = names("city");
  const districts = names("district");

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{t.title}</h1>
      <p className={styles.lead}>{t.lead}</p>

      <div className={newsStyles.article} style={{ marginTop: "var(--space-6)" }}>
        <section>
          <h2 className={newsStyles.sectionTitle}>{t.structure.title}</h2>
          <p>{format(t.structure.text, { cities: cities.length, districts: districts.length })}</p>
          <h3 style={{ marginTop: "var(--space-4)" }}>{t.structure.cities}</h3>
          <p>{cities.join(", ")}</p>
          <h3 style={{ marginTop: "var(--space-4)" }}>{t.structure.districts}</h3>
          <p>{districts.join(", ")}</p>
        </section>

        <section>
          <h2 className={newsStyles.sectionTitle}>{t.services.title}</h2>
          <p>{t.services.text}</p>
          <div style={{ marginTop: "var(--space-3)" }}>
            <Button href={`/${lang}/services`}>{t.services.button}</Button>
          </div>
        </section>

        <section>
          <h2 className={newsStyles.sectionTitle}>{t.tourism.title}</h2>
          <p>{t.tourism.text}</p>
          <div style={{ marginTop: "var(--space-3)" }}>
            <Button href={`/${lang}/tourism`} variant="light">
              {t.tourism.button}
            </Button>
          </div>
        </section>

        <p className={newsStyles.note}>{t.testNote}</p>
      </div>
    </div>
  );
}
