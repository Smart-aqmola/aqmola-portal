import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadTerritoryOptions } from "@/features/applications/load-territories";
import { ApplyWizard } from "@/features/applications/ui/apply-wizard";
import { listServiceSlugs, loadService } from "@/features/catalog/load-service";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { pickDictionary } from "@/shared/i18n/pick-dictionary";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs/breadcrumbs";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/services/[slug]/apply">;

export async function generateStaticParams() {
  const slugs = await listServiceSlugs();
  return locales.flatMap((lang) => slugs.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const [dict, details] = await Promise.all([getDictionary(lang), loadService(lang, slug)]);
  if (!details) return {};
  return { title: `${dict.apply.title}: ${details.card.title} — ${dict.brand.name}` };
}

export default async function ApplyPage({ params }: Props) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, details, territories] = await Promise.all([
    getDictionary(lang),
    loadService(lang, slug),
    loadTerritoryOptions(lang),
  ]);
  if (!details) notFound();

  return (
    <div className={`container ${styles.page}`}>
      <Breadcrumbs
        label={dict.serviceDetails.breadcrumbs.label}
        items={[
          { label: dict.nav.home, href: `/${lang}` },
          { label: dict.nav.services, href: `/${lang}/services` },
          { label: details.card.title, href: `/${lang}/services/${slug}` },
          { label: dict.apply.breadcrumb },
        ]}
      />
      <h1 className={styles.title}>{details.card.title}</h1>
      <p className={styles.lead}>{dict.apply.title}</p>
      <div className={styles.narrow}>
        <ApplyWizard
          lang={lang}
          service={{
            slug,
            title: details.card.title,
            organizationId: details.organizationId,
            audience: details.card.audience,
            documents: details.documents,
          }}
          territories={territories}
          dict={pickDictionary(dict, "apply", "home", "serviceDetails", "signIn")}
        />
      </div>
    </div>
  );
}
