import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import type { AppNotification, NotificationRefs } from "../domain/notifications";

export type NotificationsDict = Pick<
  Dictionary,
  "notifications" | "status" | "contracts" | "meters" | "billing" | "appeals"
>;

const day = (iso: string, lang: Locale) =>
  `${formatDate(iso.slice(0, 10), lang)} ${iso.slice(0, 4)}`;

function statusName(refs: NotificationRefs, dict: NotificationsDict): string {
  const key = refs.status ?? "";
  const names: Record<NonNullable<NotificationRefs["scope"]>, Record<string, string>> = {
    application: dict.status,
    contract: dict.contracts.status,
    reading: dict.meters.status,
    meterRequest: dict.meters.requestStatus,
    payment: dict.billing.status,
    appeal: dict.appeals.status,
  };
  return (refs.scope && names[refs.scope][key]) || key;
}

/** The words of a notification in the visitor's language (spec 16.5: kk and ru). */
export function notificationText(
  item: AppNotification,
  dict: NotificationsDict,
  lang: Locale,
  /** The texts the administrator wrote, by event; the dictionary is used for the rest (spec 16.5). */
  custom: Partial<Record<AppNotification["event"], string>> = {},
): string {
  const { refs } = item;
  const kindNames = dict.meters.nav as Record<string, string>;
  const title = item.event.startsWith("meter_request")
    ? (kindNames[item.title ?? ""] ?? "")
    : (item.title ?? "");
  const text = format(custom[item.event] ?? dict.notifications.events[item.event], {
    number: item.number ?? "",
    title,
    address: item.address ?? "",
    note: item.note ?? "",
    assignee: item.assignee ?? "",
    status: statusName(refs, dict),
    meter: refs.resource ? `${dict.meters.resources[refs.resource]}, № ${refs.serial ?? ""}` : "",
    date: refs.date ? day(refs.date, lang) : "",
    when: refs.slot
      ? format(dict.notifications.when, {
          date: day(refs.slot.date, lang),
          time: dict.meters.request.times[refs.slot.time],
        })
      : "",
  });
  // A template may end with a note that this notice does not have: close the gap it leaves.
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .replace(/\.{2,}/g, ".")
    .trim();
}
