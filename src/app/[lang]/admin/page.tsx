import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadProviders } from "@/features/account/load-providers";
import { AdminOverview } from "@/features/admin/ui/admin-overview";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/admin">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.admin.overview.title} — ${dict.brand.name}` };
}

export default async function AdminPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, providers] = await Promise.all([getDictionary(lang), loadProviders(lang)]);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.admin.title}</h1>
      <div className={styles.narrow}>
        <AdminOverview lang={lang} dict={dict} providers={providers} />
      </div>
    </div>
  );
}
