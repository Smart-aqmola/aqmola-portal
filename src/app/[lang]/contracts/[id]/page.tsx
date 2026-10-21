import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContractPage } from "@/features/contracts/ui/contract-detail";
import { hasLocale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs/breadcrumbs";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/contracts/[id]">;

/** Ids are made by the browser (a UUID); anything else is not an application of ours. */
const ID = /^[a-z0-9-]{1,60}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.contracts.title} — ${dict.brand.name}` };
}

export default function ContractApplicationPage({ params }: Props) {
  return (
    <div className={`container ${styles.page}`}>
      {/* Applications live in the browser, so the id is read at request time behind a placeholder. */}
      <Suspense fallback={<PageSkeleton />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: Props["params"] }) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !ID.test(id)) notFound();
  const dict = await getDictionary(lang);

  return (
    <>
      <Breadcrumbs
        label={dict.serviceDetails.breadcrumbs.label}
        items={[
          { label: dict.nav.home, href: `/${lang}` },
          { label: dict.contractsList.title, href: `/${lang}/contracts` },
          { label: dict.contracts.steps.application },
        ]}
      />
      <div className={styles.narrow}>
        <ContractPage lang={lang} id={id} dict={dict} />
      </div>
    </>
  );
}
