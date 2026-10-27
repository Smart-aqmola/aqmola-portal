import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadMissingNetworks, loadProviders } from "@/features/account/load-providers";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { contractServiceBySlug } from "@/features/catalog/domain/contract-services";
import { ContractNew } from "@/features/contracts/ui/contract-new";
import { hasLocale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { pickDictionary } from "@/shared/i18n/pick-dictionary";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs/breadcrumbs";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/contracts/new">;

const ID = /^[a-z0-9-]{1,60}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.contracts.title} — ${dict.brand.name}` };
}

export default function NewContractPage({ params, searchParams }: Props) {
  return (
    <div className={`container ${styles.page}`}>
      {/* The service and the object come from the address, so they are read at request time. */}
      <Suspense fallback={<PageSkeleton blocks={2} />}>
        <NewContract params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewContract({
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
  const service = typeof query.service === "string" ? query.service : undefined;
  const property = typeof query.property === "string" ? query.property : undefined;
  const provider = typeof query.provider === "string" ? query.provider : undefined;

  return (
    <>
      <Breadcrumbs
        label={dict.serviceDetails.breadcrumbs.label}
        items={[{ label: dict.nav.home, href: `/${lang}` }, { label: dict.contracts.title }]}
      />
      <h1 className={styles.title}>{dict.contracts.title}</h1>
      <p className={styles.lead}>{dict.contracts.lead}</p>
      <div className={styles.narrow}>
        <ContractNew
          lang={lang}
          dict={pickDictionary(dict, "contracts", "properties")}
          providers={providers}
          missing={loadMissingNetworks()}
          territories={territories}
          preset={{
            ...(service && contractServiceBySlug(service) ? { service } : {}),
            ...(property && ID.test(property) ? { property } : {}),
            ...(provider && ID.test(provider) ? { provider } : {}),
          }}
        />
      </div>
    </>
  );
}
