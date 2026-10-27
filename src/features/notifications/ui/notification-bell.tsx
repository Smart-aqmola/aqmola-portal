"use client";

import Link from "next/link";
import { isStaffRole } from "@/features/session/domain/session";
import { useSession } from "@/features/session/ui/use-session";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { Icon } from "@/shared/ui/icon/icon";
import { useNotifications } from "./use-notifications";
import styles from "./notifications.module.css";

type NotificationBellProps = {
  lang: Locale;
  labels: { label: string; withCount: string };
};

const MAX_SHOWN = 99;

/** The bell in the header with the number of unread notices (spec 16.4). Only for someone signed in as a resident or business. */
export function NotificationBell({ lang, labels }: NotificationBellProps) {
  const { session } = useSession();
  const { unread } = useNotifications(session);
  if (!session || isStaffRole(session.role)) return null;

  const count = unread.length;
  return (
    <Link
      href={`/${lang}/notifications`}
      className={styles.bell}
      aria-label={count > 0 ? format(labels.withCount, { n: count }) : labels.label}
    >
      <Icon name="bell" size={20} />
      {count > 0 && (
        <span className={styles.count} aria-hidden="true">
          {count > MAX_SHOWN ? `${MAX_SHOWN}+` : count}
        </span>
      )}
    </Link>
  );
}
