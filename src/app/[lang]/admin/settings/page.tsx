import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminSettings } from "@/features/admin/ui/admin-settings";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/admin/settings">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.admin.settings.title} — ${dict.brand.name}` };
}

export default async function AdminSettingsPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.admin.title}</h1>
      <div className={styles.narrow}>
        <AdminSettings lang={lang} dict={dict} />
      </div>
    </div>
  );
}
