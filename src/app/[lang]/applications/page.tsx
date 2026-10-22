import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountNav } from "@/features/account/ui/account-nav";
import { loadMissingNetworks, loadProviders } from "@/features/account/load-providers";
import { RequestsRegistry } from "@/features/registry/ui/requests-registry";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { pickDictionary } from "@/shared/i18n/pick-dictionary";
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
  const [dict, providers] = await Promise.all([getDictionary(lang), loadProviders(lang)]);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.applications.title}</h1>
      <div className={styles.narrow}>
        <AccountNav lang={lang} labels={dict.account.nav} current="applications" />
        <RequestsRegistry
          lang={lang}
          dict={pickDictionary(
            dict,
            "appeals",
            "applications",
            "contracts",
            "list",
            "meters",
            "registry",
            "status",
          )}
          providers={providers}
          missing={loadMissingNetworks()}
        />
      </div>
    </div>
  );
}
