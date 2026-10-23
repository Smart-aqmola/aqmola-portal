import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadOperator, loadProviderContacts } from "@/features/contacts/load-contacts";
import { ContactBlock } from "@/features/contacts/ui/contact-block";
import styles from "@/features/contacts/ui/contacts.module.css";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import page from "@/shared/styles/page.module.css";

type Props = PageProps<"/[lang]/contacts">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.contactsPage.title} — ${dict.brand.name}` };
}

export default async function ContactsPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, providers] = await Promise.all([getDictionary(lang), loadProviderContacts(lang)]);
  const t = dict.contactsPage;

  return (
    <div className={`container ${page.page}`}>
      <h1 className={page.title}>{t.title}</h1>
      <p className={page.lead}>{t.lead}</p>
      <div style={{ marginTop: "var(--space-6)" }}>
        <ContactBlock labels={t} operator={loadOperator(lang)} />
      </div>

      <h2 className={styles.sectionTitle}>{t.providersTitle}</h2>
      <p className={styles.sectionLead}>{t.providersLead}</p>
      <ul className={styles.providers}>
        {providers.map((item) => (
          <li key={item.id} className={styles.provider}>
            <h3 className={styles.providerName}>{item.name}</h3>
            <p className={styles.providerLine}>
              {t.phone}: <a href={`tel:${item.phone.replace(/[^\d+]/g, "")}`}>{item.phone}</a>
            </p>
            <p className={styles.providerLine}>
              {t.email}: <a href={`mailto:${item.email}`}>{item.email}</a>
            </p>
            <p className={styles.providerLine}>
              {t.hours}: {item.hours}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
