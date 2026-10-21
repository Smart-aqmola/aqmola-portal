import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Faq } from "@/features/help/ui/faq";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs/breadcrumbs";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/help">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.help.title} — ${dict.brand.name}` };
}

export default async function HelpPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className={`container ${styles.page}`}>
      <Breadcrumbs
        label={dict.serviceDetails.breadcrumbs.label}
        items={[{ label: dict.nav.home, href: `/${lang}` }, { label: dict.help.title }]}
      />
      <h1 className={styles.title}>{dict.help.title}</h1>
      <p className={styles.lead}>{dict.help.lead}</p>
      <div className={styles.narrow}>
        <Faq labels={dict.help} />
      </div>
    </div>
  );
}
