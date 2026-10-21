import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminTemplates } from "@/features/admin/ui/admin-templates";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/admin/templates">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.admin.templates.title} — ${dict.brand.name}` };
}

export default async function AdminTemplatesPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, ru, kk] = await Promise.all([
    getDictionary(lang),
    getDictionary("ru"),
    getDictionary("kk"),
  ]);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.admin.title}</h1>
      <div className={styles.narrow}>
        <AdminTemplates
          lang={lang}
          dict={dict}
          defaults={{ ru: ru.notifications.events, kk: kk.notifications.events }}
        />
      </div>
    </div>
  );
}
