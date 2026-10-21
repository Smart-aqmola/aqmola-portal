import type { Locale } from "@/shared/i18n/config";
import { formatDate } from "@/shared/i18n/format-date";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { sizeParts } from "@/shared/lib/upload-rules";
import { applicantName, contractText, type ContractApplication } from "../domain/contract";

type TextDict = Pick<Dictionary, "contracts" | "properties">;

/** "21 октября 2026, 06:00 UTC": the day never shifts with the visitor's time zone. */
export function formatStamp(iso: string, lang: Locale): string {
  return `${formatDate(iso.slice(0, 10), lang)} ${iso.slice(0, 4)}, ${iso.slice(11, 16)} UTC`;
}

/** "5 МБ" / "120 КБ" for a file size, with the unit word of the dictionary. */
export function fileSize(bytes: number, dict: TextDict): string {
  const { value, unit } = sizeParts(bytes);
  return `${value} ${unit === "mb" ? dict.contracts.documents.mb : dict.contracts.documents.kb}`;
}

const line = (label: string, value: string) => `${label}: ${value}`;

/** The application as a text file to read and keep (spec 4.11). */
export function applicationFileText(
  app: ContractApplication,
  dict: TextDict,
  lang: Locale,
): string {
  const t = dict.contracts;
  const a = t.application;
  const empty = t.review.empty;
  const documents = app.attachments.length
    ? app.attachments.map((file) => `- ${t.documents.names[file.key]}: ${file.name}`).join("\n")
    : `- ${empty}`;
  return [
    t.review.fileTitle,
    line(t.detail.number, app.number ?? t.detail.draftNumber),
    "",
    line(t.detail.service, app.serviceTitle),
    line(t.detail.provider, app.providerName),
    "",
    line(a.lastName, app.applicant.lastName),
    line(a.firstName, app.applicant.firstName),
    line(a.middleName, app.applicant.middleName || empty),
    line(a.iin, app.applicant.iin),
    line(a.phone, app.applicant.phone),
    line(a.email, app.applicant.email || empty),
    "",
    line(a.address, app.address),
    line(a.propertyType, dict.properties.types[app.propertyType]),
    line(a.basis, dict.properties.relations[app.basis]),
    line(
      a.rightSince,
      app.rightSince ? formatDate(app.rightSince, lang) + ` ${app.rightSince.slice(0, 4)}` : empty,
    ),
    line(a.personalAccount, app.personalAccount || empty),
    line(a.previousContract, app.previousContract || empty),
    line(
      a.meterTitle,
      app.meter.has
        ? `${app.meter.serial}${app.meter.reading ? `, ${app.meter.reading}` : ""}`
        : t.review.noMeter,
    ),
    line(a.notifyBy, a.notify[app.notifyBy]),
    "",
    `${t.review.documents}:`,
    documents,
  ].join("\n");
}

/** The confirmation that the application was submitted (spec 4.11). */
export function receiptText(app: ContractApplication, dict: TextDict, lang: Locale): string {
  const d = dict.contracts.detail;
  return [
    d.receipt.title,
    "",
    line(d.number, app.number ?? d.draftNumber),
    line(d.registeredAt, app.submittedAt ? formatStamp(app.submittedAt, lang) : "—"),
    line(d.service, app.serviceTitle),
    line(d.provider, app.providerName),
    line(d.address, app.address),
    line(d.applicant, applicantName(app.applicant)),
    "",
    d.receipt.note,
  ].join("\n");
}

/** The text of the contract for reading and download (spec 4.13), with the signatures below it. */
export function contractFileText(app: ContractApplication, dict: TextDict, lang: Locale): string {
  const tpl = dict.contracts.template;
  const body = contractText(app, [tpl.title, tpl.l1, tpl.l2, tpl.l3, tpl.l4, tpl.l5, tpl.l6]);
  const signed = [app.signatures.contractApplicant, app.signatures.contractProvider]
    .filter((signature) => signature !== undefined)
    .map((signature) =>
      dict.contracts.detail.contract.signedBy
        .replace("{name}", signature.name)
        .replace("{at}", formatStamp(signature.at, lang)),
    );
  return signed.length ? `${body}\n\n${signed.join("\n")}` : body;
}
