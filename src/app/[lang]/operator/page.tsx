import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadOperatorData } from "@/features/applications/load-operator";
import { OperatorList } from "@/features/organization/ui/operator-list";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { pickDictionary } from "@/shared/i18n/pick-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/operator">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.operator.title} — ${dict.brand.name}` };
}

export default async function OperatorPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, data] = await Promise.all([getDictionary(lang), loadOperatorData(lang)]);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.operator.title}</h1>
      <div className={styles.narrow}>
        <OperatorList
          lang={lang}
          dict={pickDictionary(dict, "applications", "cabinet", "list", "operator", "status")}
          organizations={data.organizations}
          sampleServices={data.sampleServices}
        />
      </div>
    </div>
  );
}
