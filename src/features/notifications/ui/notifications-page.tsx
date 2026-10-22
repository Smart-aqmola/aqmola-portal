"use client";

import { ShowMoreList } from "@/shared/ui/show-more/show-more";
import Link from "next/link";
import { useState } from "react";
import { useAdminConfig } from "@/features/admin/ui/use-admin-config";
import { AccountGate } from "@/features/account/ui/account-gate";
import type { DemoSession } from "@/features/applications/domain/storage";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { useToast } from "@/shared/ui/toast/toast-provider";
import { notificationText, type NotificationsDict } from "./notification-text";
import { useNotifications } from "./use-notifications";
import styles from "./notifications.module.css";

type NotificationsPageProps = { lang: Locale; dict: NotificationsDict };

/** The page "Notifications": the history of what happened, with the new ones marked (spec 16.3, 16.4). */
export function NotificationsPage(props: NotificationsPageProps) {
  const { lang, dict } = props;
  return (
    <AccountGate
      lang={lang}
      here={`/${lang}/notifications`}
      labels={dict.notifications.signInRequired}
      operatorNote={dict.notifications.operatorNote}
    >
      {(session) => <List {...props} session={session} />}
    </AccountGate>
  );
}

function List({ lang, dict, session }: NotificationsPageProps & { session: DemoSession }) {
  const t = dict.notifications;
  const toast = useToast();
  const { all, unread, markAllRead } = useNotifications(session);
  const { config } = useAdminConfig();
  const custom = lang === "ru" || lang === "kk" ? config.templates[lang] : {};
  const [only, setOnly] = useState<"all" | "unread">("all");

  if (all.length === 0) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>{t.empty.title}</h2>
        <p>{t.empty.text}</p>
      </section>
    );
  }

  const unreadIds = new Set(unread.map((item) => item.id));
  const shown = only === "unread" ? unread : all;

  return (
    <>
      <div className={styles.tools}>
        <Field label={t.filter}>
          {(control) => (
            <select
              {...control}
              value={only}
              onChange={(event) => setOnly(event.target.value as "all" | "unread")}
            >
              <option value="all">{t.filters.all}</option>
              <option value="unread">{format(t.filters.unread, { n: unread.length })}</option>
            </select>
          )}
        </Field>
        <Button
          variant="light"
          disabled={unread.length === 0}
          onClick={() => {
            markAllRead();
            toast.show(t.marked);
          }}
        >
          {t.markRead}
        </Button>
      </div>
      <p className={styles.note} aria-live="polite">
        {format(t.count, { n: shown.length })}
      </p>
      <p className={styles.note}>{t.demoNote}</p>

      <ShowMoreList items={shown} labels={dict.list}>
        {(visible) => (
          <ul className={styles.list}>
            {visible.map((item) => {
              const isNew = unreadIds.has(item.id);
              return (
                <li key={item.id}>
                  <article
                    className={styles.item}
                    data-unread={isNew}
                    aria-label={`${formatDate(item.at.slice(0, 10), lang)} ${item.at.slice(0, 4)}`}
                  >
                    <p className={styles.text} id={`notice-${item.id}`}>
                      {isNew && <span className={styles.new}>{t.new}</span>}{" "}
                      {notificationText(item, dict, lang, custom)}
                    </p>
                    <p className={styles.meta}>
                      <span>
                        {formatDate(item.at.slice(0, 10), lang)} {item.at.slice(0, 4)},{" "}
                        {item.at.slice(11, 16)} UTC
                      </span>
                      <span>
                        {t.channel.label}: {t.channel[item.channel]}
                      </span>
                      <span>
                        {t.delivery.label}: {t.delivery[item.delivery]}
                      </span>
                    </p>
                    <div>
                      <Link
                        href={`/${lang}${item.path}`}
                        className={styles.open}
                        aria-describedby={`notice-${item.id}`}
                      >
                        {t.open}
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </ShowMoreList>
    </>
  );
}
