import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPlaces } from "@/features/content/load-places";
import { PlacesGrid } from "@/features/home/ui/places-grid";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { PhotoCredits } from "@/shared/ui/photo-credits/photo-credits";
import styles from "@/shared/styles/page.module.css";

type Props = PageProps<"/[lang]/tourism">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.tourismPage.title} — ${dict.brand.name}` };
}

export default async function TourismPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, { places, credits }] = await Promise.all([getDictionary(lang), loadPlaces(lang)]);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.tourismPage.title}</h1>
      <p className={styles.lead}>{dict.tourismPage.lead}</p>
      <div style={{ marginTop: "var(--space-6)" }}>
        <PlacesGrid
          lang={lang}
          factLabels={dict.home.tourism.facts}
          places={places.map((place) => ({
            slug: place.slug,
            name: place.name,
            summary: place.summary,
            territory: place.territory,
            facts: place.facts,
            photo: place.photo,
          }))}
        />
      </div>
      <div style={{ marginTop: "var(--space-6)" }}>
        <PhotoCredits label={dict.home.credits.label} credits={credits} />
      </div>
    </div>
  );
}
