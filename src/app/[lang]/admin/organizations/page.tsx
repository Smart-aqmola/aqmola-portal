import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadProviders } from "@/features/account/load-providers";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { AdminOrganizations } from "@/features/admin/ui/admin-organizations";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/admin/organizations">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.admin.organizations.title} — ${dict.brand.name}` };
}

export default async function AdminOrganizationsPage({ params }: Props) {
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
        <AdminOrganizations
          lang={lang}
          dict={dict}
          providers={providers}
          territories={territories}
        />
      </div>
    </div>
  );
}
