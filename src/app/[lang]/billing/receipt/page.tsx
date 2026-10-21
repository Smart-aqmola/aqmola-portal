import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadMissingNetworks, loadProviders } from "@/features/account/load-providers";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { ReceiptPage } from "@/features/billing/ui/receipt-page";
import { hasLocale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/billing/receipt">;

const ID = /^[a-z0-9-]{1,60}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.billing.nav.receipt} — ${dict.brand.name}` };
}

export default function BillingReceiptPage({ params, searchParams }: Props) {
  return (
    <div className={`container ${styles.page}`}>
      {/* The object comes from the address, so it is read at request time. */}
      <Suspense fallback={<PageSkeleton blocks={2} />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({
  params,
  searchParams,
}: {
  params: Props["params"];
  searchParams: Props["searchParams"];
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, territories, providers, query] = await Promise.all([
    getDictionary(lang),
    loadTerritoryOptions(lang),
    loadProviders(lang),
    searchParams,
  ]);
  const property =
    typeof query.property === "string" && ID.test(query.property) ? query.property : undefined;

  return (
    <>
      <h1 className={styles.title}>{dict.billing.title}</h1>
      <p className={styles.lead}>{dict.billing.lead}</p>
      <div className={styles.narrow}>
        <ReceiptPage
          lang={lang}
          dict={dict}
          territories={territories}
          providers={providers}
          missing={loadMissingNetworks()}
          preset={{ property }}
        />
      </div>
    </>
  );
}
