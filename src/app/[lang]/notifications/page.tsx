import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotificationsPage } from "@/features/notifications/ui/notifications-page";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { pickDictionary } from "@/shared/i18n/pick-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/notifications">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.notifications.title} — ${dict.brand.name}` };
}

export default async function NotificationsRoute({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.notifications.title}</h1>
      <p className={styles.lead}>{dict.notifications.lead}</p>
      <div className={styles.narrow}>
        <NotificationsPage
          lang={lang}
          dict={pickDictionary(
            dict,
            "appeals",
            "billing",
            "contracts",
            "list",
            "meters",
            "notifications",
            "status",
          )}
        />
      </div>
    </div>
  );
}
