import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApplicationsList } from "@/features/applications/ui/applications-list";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/applications">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.applications.title} — ${dict.brand.name}` };
}

export default async function ApplicationsPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.applications.title}</h1>
      <div className={styles.narrow}>
        <ApplicationsList lang={lang} dict={dict} />
      </div>
    </div>
  );
}
