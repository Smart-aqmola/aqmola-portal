import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OtherSignIn } from "@/features/account/ui/other-sign-in";
import { PhoneSignIn } from "@/features/account/ui/phone-sign-in";
import { safeNextPath } from "@/features/applications/domain/next-path";
import { SignInPanel } from "@/features/applications/ui/sign-in-panel";
import { loadOrganizationOptions } from "@/features/applications/load-territories";
import { hasLocale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import styles from "@/features/applications/ui/page.module.css";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";

type Props = PageProps<"/[lang]/sign-in">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.signIn.title} — ${dict.brand.name}` };
}

export default function SignInPage({ params, searchParams }: Props) {
  return (
    <div className={`container ${styles.page}`}>
      {/* `next` comes from the address, so it is read at request time behind a placeholder. */}
      <Suspense fallback={<PageSkeleton blocks={2} />}>
        <SignIn params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SignIn({
  params,
  searchParams,
}: {
  params: Props["params"];
  searchParams: Props["searchParams"];
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, query, organizations] = await Promise.all([
    getDictionary(lang),
    searchParams,
    loadOrganizationOptions(lang),
  ]);
  const raw = query.next;
  const next = safeNextPath(lang, typeof raw === "string" ? raw : undefined);

  return (
    <>
      <h1 className={styles.title}>{dict.signIn.title}</h1>
      <p className={styles.lead}>{dict.signIn.lead}</p>
      <div className={styles.narrow}>
        <PhoneSignIn labels={dict.signIn.phone} next={next} signUpHref={`/${lang}/sign-up`} />
        <OtherSignIn labels={dict.signIn.other} />
        <h2 className={styles.subtitle}>{dict.signIn.orProfile}</h2>
        <SignInPanel
          labels={dict.signIn}
          next={next}
          applicationsHref={`/${lang}/applications`}
          operatorHref={`/${lang}/operator`}
          adminHref={`/${lang}/admin`}
          organizations={organizations}
        />
      </div>
    </>
  );
}
