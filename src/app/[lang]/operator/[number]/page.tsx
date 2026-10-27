import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { OperatorApplication } from "@/features/organization/ui/operator-application";
import { NUMBER_PATTERN } from "@/features/applications/domain/application";
import { hasLocale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { pickDictionary } from "@/shared/i18n/pick-dictionary";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs/breadcrumbs";
import styles from "@/features/applications/ui/page.module.css";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";

type Props = PageProps<"/[lang]/operator/[number]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, number } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${number} — ${dict.operator.title} — ${dict.brand.name}` };
}

export default function OperatorApplicationPage({ params }: Props) {
  return (
    <div className={`container ${styles.page}`}>
      {/* Applications live in the browser, so the number is read at request time. */}
      <Suspense fallback={<PageSkeleton />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: Props["params"] }) {
  const { lang, number } = await params;
  if (!hasLocale(lang) || !NUMBER_PATTERN.test(number)) notFound();
  const [dict, territories] = await Promise.all([getDictionary(lang), loadTerritoryOptions(lang)]);

  return (
    <>
      <Breadcrumbs
        label={dict.serviceDetails.breadcrumbs.label}
        items={[
          { label: dict.nav.home, href: `/${lang}` },
          { label: dict.operator.title, href: `/${lang}/operator` },
          { label: number },
        ]}
      />
      <div className={styles.narrow}>
        <OperatorApplication
          lang={lang}
          number={number}
          justCreated={false}
          territories={territories}
          dict={pickDictionary(dict, "applications", "operator", "serviceDetails", "status")}
        />
      </div>
    </>
  );
}
