import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadMissingNetworks, loadProviders } from "@/features/account/load-providers";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { PaymentsList } from "@/features/billing/ui/payments-list";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/billing/payments">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.billing.nav.payments} — ${dict.brand.name}` };
}

export default async function PaymentsPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, territories, providers] = await Promise.all([
    getDictionary(lang),
    loadTerritoryOptions(lang),
    loadProviders(lang),
  ]);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.billing.title}</h1>
      <p className={styles.lead}>{dict.billing.lead}</p>
      <div className={styles.narrow}>
        <PaymentsList
          lang={lang}
          dict={dict}
          territories={territories}
          providers={providers}
          missing={loadMissingNetworks()}
        />
      </div>
    </div>
  );
}
