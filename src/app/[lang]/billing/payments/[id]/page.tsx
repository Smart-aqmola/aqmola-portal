import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadMissingNetworks, loadProviders } from "@/features/account/load-providers";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { PaymentDetail } from "@/features/billing/ui/payment-detail";
import { hasLocale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { pickDictionary } from "@/shared/i18n/pick-dictionary";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/billing/payments/[id]">;

/** Ids are made by the browser (a UUID); anything else is not a payment of ours. */
const ID = /^[a-z0-9-]{1,60}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.billing.nav.payments} — ${dict.brand.name}` };
}

export default function PaymentPage({ params }: Props) {
  return (
    <div className={`container ${styles.page}`}>
      {/* Payments live in the browser, so the id is read at request time behind a placeholder. */}
      <Suspense fallback={<PageSkeleton />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: Props["params"] }) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !ID.test(id)) notFound();
  const [dict, territories, providers] = await Promise.all([
    getDictionary(lang),
    loadTerritoryOptions(lang),
    loadProviders(lang),
  ]);

  return (
    <>
      <h1 className={styles.title}>{dict.billing.title}</h1>
      <p className={styles.lead}>{dict.billing.lead}</p>
      <div className={styles.narrow}>
        <PaymentDetail
          lang={lang}
          dict={pickDictionary(dict, "account", "billing", "list", "properties")}
          territories={territories}
          providers={providers}
          missing={loadMissingNetworks()}
          id={id}
        />
      </div>
    </>
  );
}
