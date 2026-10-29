"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { useAdminConfig } from "@/features/admin/ui/use-admin-config";
import { isStaffRole } from "@/features/session/domain/session";
import { useSession } from "@/features/session/ui/use-session";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import { Icon } from "@/shared/ui/icon/icon";
import { notificationText, type NoticeWords } from "./notification-text";
import { useNotifications } from "./use-notifications";
import styles from "./notifications.module.css";

type NotificationBellProps = {
  lang: Locale;
  dict: NoticeWords;
};

const MAX_SHOWN = 99;
const IN_PANEL = 5;

/**
 * The bell in the header with the number of unread notices (spec 16.4). A click opens the latest
 * few on top of the page; each leads to its record, and the full history is one link away.
 * Only for someone signed in as a resident or business.
 */
export function NotificationBell({ lang, dict }: NotificationBellProps) {
  const t = dict.notifications;
  // Outside the app router (tests) there is no path; an empty one keeps the panel closed.
  const pathname = usePathname() ?? "";
  const { session } = useSession();
  const { all, unread, markAllRead } = useNotifications(session);
  const { config } = useAdminConfig();
  // Remembered per page, so following a link in the panel closes it without an effect.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const button = useRef<HTMLButtonElement>(null);
  if (!session || isStaffRole(session.role)) return null;

  const count = unread.length;
  const unreadIds = new Set(unread.map((item) => item.id));
  const custom = lang === "ru" || lang === "kk" ? config.templates[lang] : {};

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      setOpenPath(null);
      button.current?.focus();
    }
  }

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpenPath(null);
  }

  return (
    <div className={styles.bellWrap} onKeyDown={onKeyDown} onBlur={onBlur}>
      <button
        ref={button}
        type="button"
        className={styles.bell}
        aria-expanded={open}
        aria-controls={open ? "notice-panel" : undefined}
        aria-label={count > 0 ? format(t.bell.withCount, { n: count }) : t.bell.label}
        onClick={() => setOpenPath(open ? null : pathname)}
      >
        <Icon name="bell" size={20} />
        {count > 0 && (
          <span className={styles.count} aria-hidden="true">
            {count > MAX_SHOWN ? `${MAX_SHOWN}+` : count}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notice-panel"
          role="group"
          aria-label={t.title}
          className={styles.panel}
          // A click on text or a gap inside moves the focus here, not out, so the panel stays open.
          tabIndex={-1}
        >
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>{t.title}</h2>
            {count > 0 && (
              <button type="button" className={styles.panelMark} onClick={markAllRead}>
                {t.markRead}
              </button>
            )}
          </div>

          {all.length === 0 ? (
            <p className={styles.panelEmpty}>{t.empty.title}</p>
          ) : (
            <ul className={styles.panelList}>
              {all.slice(0, IN_PANEL).map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/${lang}${item.path}`}
                    className={styles.panelItem}
                    data-unread={unreadIds.has(item.id)}
                  >
                    {unreadIds.has(item.id) && <span className="visually-hidden">{t.new}: </span>}
                    <span className={styles.panelText}>
                      {notificationText(item, dict, lang, custom)}
                    </span>
                    <span className={styles.panelDate}>
                      {formatDate(item.at.slice(0, 10), lang)}, {item.at.slice(11, 16)} UTC
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link href={`/${lang}/notifications`} className={styles.panelAll}>
            {t.bell.all}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
