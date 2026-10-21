import type { Metadata } from "next";
import { Onest } from "next/font/google";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { noFlashScript } from "@/features/display/domain/settings";
import { hasLocale, locales } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { DemoBanner } from "@/shared/ui/demo-banner/demo-banner";
import { SiteFooter } from "@/shared/ui/site-footer/site-footer";
import { SiteHeader } from "@/shared/ui/site-header/site-header";
import { ToastProvider } from "@/shared/ui/toast/toast-provider";
import "@/shared/styles/tokens.css";
import "@/shared/styles/globals.css";

// Onest covers every Kazakh Cyrillic letter (ә ғ қ ң ө ү ұ һ і); Jost from the mockup does not.
const onest = Onest({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-onest",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.meta.title, description: dict.meta.description };
}

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html lang={lang} className={onest.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body>
        <ToastProvider>
          <a className="skip-link" href="#content">
            {dict.header.skipToContent}
          </a>
          <DemoBanner text={dict.demo.banner} />
          <div className="shell">
            {/* On pages whose address is only known at request time the header streams in. */}
            <Suspense
              fallback={<div style={{ height: "var(--header-height)" }} aria-hidden="true" />}
            >
              <SiteHeader lang={lang} dict={dict} />
            </Suspense>
            <main id="content">{children}</main>
          </div>
          <SiteFooter lang={lang} dict={dict} />
        </ToastProvider>
      </body>
    </html>
  );
}
