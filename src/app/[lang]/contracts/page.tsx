import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountNav } from "@/features/account/ui/account-nav";
import { ContractsList } from "@/features/contracts/ui/contracts-list";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { pickDictionary } from "@/shared/i18n/pick-dictionary";
import styles from "@/features/applications/ui/page.module.css";

type Props = PageProps<"/[lang]/contracts">;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.contractsList.title} — ${dict.brand.name}` };
}

export default async function ContractsPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{dict.contractsList.title}</h1>
      <p className={styles.lead}>{dict.contractsList.lead}</p>
      <div className={styles.narrow}>
        <AccountNav lang={lang} labels={dict.account.nav} current="contracts" />
        <ContractsList lang={lang} dict={pickDictionary(dict, "contracts", "contractsList")} />
      </div>
    </div>
  );
}
