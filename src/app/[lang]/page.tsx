import Image from "next/image";
import { notFound } from "next/navigation";
import { ApplicationsPrompt } from "@/features/home/ui/applications-prompt";
import { ComingSoon } from "@/features/home/ui/coming-soon";
import { ContactForm } from "@/features/home/ui/contact-form";
import { HomeSearch } from "@/features/home/ui/home-search";
import { NewsList } from "@/features/home/ui/news-list";
import { SituationServices } from "@/features/home/ui/situation-services";
import { loadHome } from "@/features/home/load-home";
import { hasLocale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { PhotoCredits } from "@/shared/ui/photo-credits/photo-credits";
import styles from "./page.module.css";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, home] = await Promise.all([getDictionary(lang), loadHome(lang)]);
  const t = dict.home;

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.band}>
          <Image src={home.hero.url} alt="" fill priority sizes="100vw" className={styles.photo} />
          <div className={styles.shade} />
        </div>
        <div className={`container ${styles.heroContent}`}>
          <h1 className={styles.title}>{t.hero.title}</h1>
          <p className={styles.lead}>{t.hero.lead}</p>
          <HomeSearch lang={lang} labels={t.search} territories={home.territories} />
          <SituationServices
            lang={lang}
            title={t.situations.title}
            groups={home.situations}
            labels={t.situations}
            serviceLabels={t.service}
            favoriteLabels={dict.catalog.favorites}
          />
        </div>
      </section>

      <div className={`container ${styles.sections}`}>
        <div className={styles.columns}>
          <NewsList lang={lang} title={t.news.title} allLabel={t.news.all} items={home.news} />
          <ApplicationsPrompt lang={lang} labels={t.applications} />
        </div>

        <div className={styles.columns}>
          <ContactForm labels={t.contact} />
          <ComingSoon
            title={t.comingSoon.title}
            badge={t.comingSoon.badge}
            items={home.comingSoon}
          />
        </div>

        <PhotoCredits label={t.credits.label} credits={home.credits} />
      </div>
    </>
  );
}
