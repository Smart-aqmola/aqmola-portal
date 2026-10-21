import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import { sizeParts } from "@/shared/lib/upload-rules";
import type { Meter } from "../domain/meter";
import type { MeterRequest } from "../domain/meter-request";
import type { MetersDict } from "./meters-area";

/** "21 октября 2026" from a date or a date with time; the day never shifts with the time zone. */
export function day(iso: string | undefined, lang: Locale, empty: string): string {
  return iso ? `${formatDate(iso.slice(0, 10), lang)} ${iso.slice(0, 4)}` : empty;
}

/** "21 октября 2026, 06:00 UTC". */
export function stamp(iso: string, lang: Locale): string {
  return `${day(iso, lang, "")}, ${iso.slice(11, 16)} UTC`;
}

/** A reading as the dials show it: with the comma of the language and the decimals of the meter. */
export function readingText(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(".", ",");
}

/** "Холодная вода, № SN-1": how a meter is named in lists and selects. */
export function meterLabel(meter: Pick<Meter, "resource" | "serial">, dict: MetersDict): string {
  return format(dict.meters.common.meterOption, {
    resource: dict.meters.resources[meter.resource],
    serial: meter.serial,
  });
}

/** "5 МБ" / "120 КБ" for a file size. */
export function fileSize(bytes: number, units: { kb: string; mb: string }): string {
  const { value, unit } = sizeParts(bytes);
  return `${value} ${unit === "mb" ? units.mb : units.kb}`;
}

/** The act of the work as a text file to keep (spec 8.10). It is a demo and says so. */
export function actText(
  request: MeterRequest,
  meter: Pick<Meter, "serial"> | undefined,
  dict: MetersDict,
  lang: Locale,
): string {
  const t = dict.meters.requestDetail;
  const r = t.result;
  const result = request.result;
  const lines = [
    t.act.titles[request.kind].toUpperCase(),
    t.act.demo,
    "",
    `${dict.meters.requests.fields.number}: ${request.number}`,
    `${dict.meters.request.address}: ${request.address}`,
    `${dict.meters.common.service}: ${dict.meters.resources[request.resource]}`,
  ];
  if (meter) lines.push(`${dict.meters.common.meter}: ${meter.serial}`);
  if (request.assignee) lines.push(`${t.fields.assignee}: ${request.assignee}`);
  if (result) {
    lines.push(`${r.date}: ${day(result.at, lang, "")}`);
    if (result.newSerial) lines.push(`${r.newSerial}: ${result.newSerial}`);
    if (result.reading) lines.push(`${r.reading}: ${result.reading}`);
    if (result.seal) lines.push(`${r.seal}: ${result.seal}`);
    if (result.nextVerification) {
      lines.push(`${r.nextVerification}: ${day(result.nextVerification, lang, "")}`);
    }
  }
  return lines.join("\n") + "\n";
}
