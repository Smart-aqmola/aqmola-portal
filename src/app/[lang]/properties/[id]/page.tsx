import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PropertyDetail } from "@/features/account/ui/property-detail";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { hasLocale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs/breadcrumbs";
import styles from "@/features/applications/ui/page.module.css";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";

type Props = PageProps<"/[lang]/properties/[id]">;

/** Ids are made by the browser (a UUID); anything else is not an object of ours. */
const ID = /^[a-z0-9-]{1,60}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.properties.title} — ${dict.brand.name}` };
}

export default function PropertyPage({ params }: Props) {
  return (
    <div className={`container ${styles.page}`}>
      {/* Objects live in the browser, so the id is read at request time behind a placeholder. */}
      <Suspense fallback={<PageSkeleton />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: Props["params"] }) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !ID.test(id)) notFound();
  const [dict, territories] = await Promise.all([getDictionary(lang), loadTerritoryOptions(lang)]);

  return (
    <>
      <Breadcrumbs
        label={dict.serviceDetails.breadcrumbs.label}
        items={[
          { label: dict.nav.home, href: `/${lang}` },
          { label: dict.properties.title, href: `/${lang}/properties` },
          { label: dict.properties.detail.address },
        ]}
      />
      <div className={styles.narrow}>
        <PropertyDetail lang={lang} id={id} labels={dict.properties} territories={territories} />
      </div>
    </>
  );
}
