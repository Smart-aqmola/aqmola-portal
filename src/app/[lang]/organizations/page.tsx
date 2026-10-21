import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadOrganizations } from "@/features/catalog/load-organizations";
import { OrganizationsList } from "@/features/catalog/ui/organizations-list";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs/breadcrumbs";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/organizations">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.organizations.title} — ${dict.brand.name}` };
}

export default async function OrganizationsPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, groups] = await Promise.all([getDictionary(lang), loadOrganizations(lang)]);

  return (
    <div className={`container ${styles.page}`}>
      <Breadcrumbs
        label={dict.serviceDetails.breadcrumbs.label}
        items={[{ label: dict.nav.home, href: `/${lang}` }, { label: dict.organizations.title }]}
      />
      <h1 className={styles.title}>{dict.organizations.title}</h1>
      <p className={styles.lead}>{dict.organizations.lead}</p>
      <div className={styles.narrow}>
        <OrganizationsList lang={lang} groups={groups} labels={dict.organizations} />
      </div>
    </div>
  );
}
