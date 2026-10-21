import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadProviders } from "@/features/account/load-providers";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { AdminReports } from "@/features/admin/ui/admin-reports";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/admin/reports">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.admin.reports.title} — ${dict.brand.name}` };
}

export default async function AdminReportsPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, providers, territories] = await Promise.all([
    getDictionary(lang),
    loadProviders(lang),
    loadTerritoryOptions(lang),
  ]);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.admin.title}</h1>
      <div className={styles.narrow}>
        <AdminReports lang={lang} dict={dict} providers={providers} territories={territories} />
      </div>
    </div>
  );
}
