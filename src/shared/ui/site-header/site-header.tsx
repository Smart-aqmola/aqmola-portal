"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { useSession } from "@/features/applications/ui/use-session";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { DisplaySettings } from "@/features/display/ui/display-settings";
import { Button } from "../button/button";
import { Icon } from "../icon/icon";
import { LanguageSwitcher } from "../language-switcher/language-switcher";
import styles from "./site-header.module.css";

type SiteHeaderProps = {
  lang: Locale;
  dict: Pick<Dictionary, "brand" | "nav" | "header" | "display">;
};

export function SiteHeader({ lang, dict }: SiteHeaderProps) {
  const pathname = usePathname();
  const { session } = useSession();
  // The menu is remembered per page, so navigating closes it without an effect.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const menuButton = useRef<HTMLButtonElement>(null);

  const home = `/${lang}`;
  const items = [
    { href: home, label: dict.nav.home },
    { href: `${home}/services`, label: dict.nav.services },
    { href: `${home}/applications`, label: dict.nav.applications },
    { href: `${home}/news`, label: dict.nav.news },
    { href: `${home}/tourism`, label: dict.nav.tourism },
    // A guest can register right from the menu (spec 1.1); once signed in the item goes away.
    // On a wide bar it is hidden (see `.drawerOnly`); the sign-in page offers registration too.
    ...(session ? [] : [{ href: `${home}/sign-up`, label: dict.header.signUp, drawerOnly: true }]),
  ];

  const isCurrent = (href: string) =>
    href === home ? pathname === home : pathname === href || pathname.startsWith(`${href}/`);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      setOpenPath(null);
      menuButton.current?.focus();
    }
  }

  return (
    <header className={styles.header} data-overlay={pathname === home} onKeyDown={onKeyDown}>
      <div className={`container ${styles.bar}`}>
        <Link href={home} className={styles.brand}>
          <span className={styles.brandPill}>
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
              <path d="M2 22l8-12 5 6 3-4 8 10z" fill="#1c7c9c" />
              <circle cx="20" cy="7" r="3" fill="#e9b23c" />
            </svg>
            <span className={styles.brandName}>{dict.brand.name}</span>
          </span>
          <span className={styles.tagline}>{dict.brand.tagline}</span>
        </Link>

        <nav id="site-nav" className={styles.nav} aria-label={dict.nav.label} data-open={open}>
          <ul className={styles.navList}>
            {items.map((item) => (
              <li key={item.href} className={"drawerOnly" in item ? styles.drawerOnly : undefined}>
                <Link
                  href={item.href}
                  className={styles.navLink}
                  aria-current={isCurrent(item.href) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.tools}>
          <LanguageSwitcher lang={lang} label={dict.header.language} />
          <DisplaySettings labels={dict.display} />
          <Button
            variant="ghost"
            href={
              session
                ? `${home}/${session.role === "operator" ? "operator" : "applications"}`
                : `${home}/sign-in`
            }
            className={styles.signIn}
          >
            <Icon name="user" size={18} />
            <span className={styles.signInText}>{session ? session.name : dict.header.signIn}</span>
          </Button>
          <button
            ref={menuButton}
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls="site-nav"
            aria-label={open ? dict.header.closeMenu : dict.header.openMenu}
            onClick={() => setOpenPath(open ? null : pathname)}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>
    </header>
  );
}
