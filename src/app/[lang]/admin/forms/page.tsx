import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminForms } from "@/features/admin/ui/admin-forms";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { pickDictionary } from "@/shared/i18n/pick-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/admin/forms">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.admin.forms.title} — ${dict.brand.name}` };
}

export default async function AdminFormsPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.admin.title}</h1>
      <div className={styles.narrow}>
        <AdminForms
          lang={lang}
          dict={pickDictionary(
            dict,
            "admin",
            "appeals",
            "billing",
            "cabinet",
            "contracts",
            "list",
            "meters",
            "notifications",
            "properties",
            "status",
          )}
        />
      </div>
    </div>
  );
}
