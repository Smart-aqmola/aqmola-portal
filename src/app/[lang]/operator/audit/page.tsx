import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadProviders } from "@/features/account/load-providers";
import { OperatorAudit } from "@/features/organization/ui/operator-audit";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/operator/audit">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.cabinet.audit.title} — ${dict.brand.name}` };
}

export default async function OperatorAuditPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, providers] = await Promise.all([getDictionary(lang), loadProviders(lang)]);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.cabinet.title}</h1>
      <div className={styles.narrow}>
        <OperatorAudit lang={lang} dict={dict} providers={providers} />
      </div>
    </div>
  );
}
