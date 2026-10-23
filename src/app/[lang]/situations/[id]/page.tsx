import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadSituation } from "@/features/catalog/load-situation";
import { sectors, situationIds, type Sector } from "@/features/catalog/domain/types";
import {
  OtherSituations,
  SituationCategories,
  SituationHeader,
  SituationServices,
} from "@/features/catalog/ui/situation-page";
import styles from "@/features/catalog/ui/situation-page.module.css";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";
import page from "@/shared/styles/page.module.css";

type Props = PageProps<"/[lang]/situations/[id]">;

export function generateStaticParams() {
  return locales.flatMap((lang) => situationIds.map((id) => ({ lang, id })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(lang)) return {};
  const [dict, situation] = await Promise.all([getDictionary(lang), loadSituation(lang, id)]);
  if (!situation) return {};
  return {
    title: `${situation.name} — ${dict.situationPage.label} — ${dict.brand.name}`,
    description: situation.summary,
  };
}

export default function SituationPage({ params, searchParams }: Props) {
  return (
    <div className={`container ${page.page}`}>
      {/* The chosen category comes from the address, so the page streams in behind this placeholder. */}
      <Suspense fallback={<PageSkeleton blocks={3} />}>
        <Situation params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Situation({
  params,
  searchParams,
}: {
  params: Props["params"];
  searchParams: Props["searchParams"];
}) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, situation, query] = await Promise.all([
    getDictionary(lang),
    loadSituation(lang, id),
    searchParams,
  ]);
  if (!situation) notFound();

  const raw = Array.isArray(query.category) ? query.category[0] : query.category;
  const category =
    (sectors as readonly string[]).includes(raw ?? "") &&
    situation.categories.some((item) => item.id === raw)
      ? (raw as Sector)
      : "all";
  const base = `/${lang}/situations/${situation.id}`;
  const links = [
    { id: "all" as const, name: dict.situationPage.all, count: situation.cards.length, href: base },
    ...situation.categories.map((item) => ({ ...item, href: `${base}?category=${item.id}` })),
  ];
  const cards =
    category === "all"
      ? situation.cards
      : situation.cards.filter((card) => card.categoryId === category);

  return (
    <>
      <SituationHeader lang={lang} labels={dict.situationPage} situation={situation} />
      <div className={styles.body}>
        <SituationCategories labels={dict.situationPage} links={links} current={category} />
        <SituationServices lang={lang} dict={dict} cards={cards} />
      </div>
      <OtherSituations lang={lang} labels={dict.situationPage} situations={situation.others} />
    </>
  );
}
