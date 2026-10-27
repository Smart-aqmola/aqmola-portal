"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { useSession } from "@/features/session/ui/use-session";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { DisplaySettings } from "@/features/display/ui/display-settings";
import { useEnabledLocales } from "@/features/admin/ui/use-admin-config";
import { NotificationBell } from "@/features/notifications/ui/notification-bell";
import { Button } from "../button/button";
import { Icon } from "../icon/icon";
import { LanguageSwitcher } from "../language-switcher/language-switcher";
import styles from "./site-header.module.css";

type SiteHeaderProps = {
  lang: Locale;
  dict: Pick<Dictionary, "brand" | "nav" | "header" | "display" | "notifications">;
};

export function SiteHeader({ lang, dict }: SiteHeaderProps) {
  const pathname = usePathname();
  const { session } = useSession();
  const enabledLocales = useEnabledLocales();
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
            {/* The portal's mark "house and drop" (design/logo, variant B). */}
            <svg width="30" height="30" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
              <rect x="2" y="2" width="44" height="44" rx="13" fill="#1c7c9c" />
              <path
                d="M10 33 24 12l14 21"
                fill="none"
                stroke="#fff"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M24 22s5 6 5 9.5a5 5 0 0 1-10 0C19 28 24 22 24 22z" fill="#e9b23c" />
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
          <LanguageSwitcher lang={lang} label={dict.header.language} locales={enabledLocales} />
          <DisplaySettings labels={dict.display} />
          <NotificationBell lang={lang} labels={dict.notifications.bell} />
          <Button
            variant="ghost"
            href={
              session
                ? `${home}/${session.role === "operator" ? "operator" : session.role === "admin" ? "admin" : "applications"}`
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
