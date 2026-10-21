import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SignUpForm } from "@/features/account/ui/sign-up-form";
import { safeNextPath } from "@/features/applications/domain/next-path";
import { hasLocale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import styles from "@/features/applications/ui/page.module.css";
import { PageSkeleton } from "@/shared/ui/skeleton/page-skeleton";

type Props = PageProps<"/[lang]/sign-up">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.signUp.title} — ${dict.brand.name}` };
}

export default function SignUpPage({ params, searchParams }: Props) {
  return (
    <div className={`container ${styles.page}`}>
      {/* `next` comes from the address, so it is read at request time behind a placeholder. */}
      <Suspense fallback={<PageSkeleton blocks={2} />}>
        <SignUp params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SignUp({
  params,
  searchParams,
}: {
  params: Props["params"];
  searchParams: Props["searchParams"];
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, query] = await Promise.all([getDictionary(lang), searchParams]);
  const raw = query.next;
  // A new resident starts by adding an object, unless they came here from somewhere specific.
  const next = typeof raw === "string" ? safeNextPath(lang, raw) : `/${lang}/properties`;

  return (
    <>
      <h1 className={styles.title}>{dict.signUp.title}</h1>
      <p className={styles.lead}>{dict.signUp.lead}</p>
      <div className={styles.narrow}>
        <SignUpForm labels={dict.signUp} next={next} signInHref={`/${lang}/sign-in`} />
      </div>
    </>
  );
}
