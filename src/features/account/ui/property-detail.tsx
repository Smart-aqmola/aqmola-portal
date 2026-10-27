"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import { ownerIdOf } from "@/features/session/domain/session";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { formatDate } from "@/shared/i18n/format-date";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { useToast } from "@/shared/ui/toast/toast-provider";
import {
  MAX_FILES,
  MAX_FILE_BYTES,
  checkFile,
  megabytes,
  sizeParts,
} from "@/shared/lib/upload-rules";
import {
  addressLine,
  decideVerification,
  requestVerification,
  type Property,
  type StoredFile,
} from "../domain/property";
import type { Sector } from "@/features/catalog/domain/types";
import type { ProviderInfo } from "../domain/availability";
import { AccountGate } from "./account-gate";
import { PropertyServices } from "./property-services";
import { useProperties } from "./use-properties";
import { VerificationBadge } from "./verification-badge";
import styles from "./account-styles";

type PropertyDetailProps = {
  lang: Locale;
  id: string;
  labels: Dictionary["properties"];
  territories: { id: string; name: string }[];
  providers: readonly ProviderInfo[];
  missing: Record<string, readonly Sector[]>;
};

export function PropertyDetail(props: PropertyDetailProps) {
  const { lang, id, labels } = props;
  return (
    <AccountGate
      lang={lang}
      here={`/${lang}/properties/${id}`}
      labels={labels.signInRequired}
      operatorNote={labels.operatorNote}
    >
      {(session) => <Detail {...props} ownerId={ownerIdOf(session)} />}
    </AccountGate>
  );
}

function Detail({
  lang,
  id,
  ownerId,
  labels,
  territories,
  providers,
  missing,
}: PropertyDetailProps & { ownerId: string }) {
  const { mine, replace } = useProperties(ownerId);
  const property = mine.find((item) => item.id === id);
  const t = labels.detail;

  if (!property) {
    return (
      <section className={styles.card}>
        <h1 className={styles.heading}>{t.notFound.title}</h1>
        <p>{t.notFound.text}</p>
        <div>
          <Button href={`/${lang}/properties`}>{t.notFound.button}</Button>
        </div>
      </section>
    );
  }

  const territory = territories.find((item) => item.id === property.territoryId)?.name ?? "";
  const address = addressLine(property, territory, labels.flat);
  const added = `${formatDate(property.createdAt.slice(0, 10), lang)} ${property.createdAt.slice(0, 4)}`;

  return (
    <>
      <Link href={`/${lang}/properties`} className={styles.back}>
        ← {t.back}
      </Link>
      <div className={styles.detailHead}>
        <h1 className={styles.detailTitle}>{address}</h1>
        <VerificationBadge
          status={property.verification.status}
          label={labels.verification[property.verification.status]}
        />
      </div>

      <section className={styles.card} aria-label={t.address}>
        <dl className={styles.facts}>
          <div>
            <dt>{t.type}</dt>
            <dd>{labels.types[property.type]}</dd>
          </div>
          <div>
            <dt>{t.relation}</dt>
            <dd>{labels.relations[property.relation]}</dd>
          </div>
          <div>
            <dt>{t.owner}</dt>
            <dd>{property.ownerInfo}</dd>
          </div>
          <div>
            <dt>{t.account}</dt>
            <dd>{property.personalAccount ?? t.accountNone}</dd>
          </div>
          <div>
            <dt>{t.added}</dt>
            <dd>{added}</dd>
          </div>
        </dl>
      </section>

      <VerifyPanel property={property} labels={labels} onChange={replace} />
      <PropertyServices
        lang={lang}
        property={property}
        providers={providers}
        missing={missing}
        labels={t.services}
      />
    </>
  );
}

type VerifyPanelProps = {
  property: Property;
  labels: Dictionary["properties"];
  onChange: (changed: Property) => void;
};

function VerifyPanel({ property, labels, onChange }: VerifyPanelProps) {
  const toast = useToast();
  const t = labels.detail.verify;
  const { status } = property.verification;
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [problems, setProblems] = useState<string[]>([]);

  function describe(list: readonly StoredFile[]): string[] {
    const found: string[] = [];
    for (const file of list) {
      const problem = checkFile(file);
      if (problem) {
        found.push(
          format(t.documents.errors[problem], { name: file.name, size: megabytes(MAX_FILE_BYTES) }),
        );
      }
    }
    if (list.length > MAX_FILES) found.push(format(t.documents.errors.count, { count: MAX_FILES }));
    return found;
  }

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []).map(({ name, size }) => ({ name, size }));
    // Clear the field so the same file can be picked again after it was removed.
    event.target.value = "";
    const next = [...files, ...picked];
    setFiles(next);
    setProblems(describe(next));
  }

  function removeFile(index: number) {
    const next = files.filter((_, position) => position !== index);
    setFiles(next);
    setProblems(describe(next));
  }

  function viaState() {
    const result = requestVerification(property, { method: "state_integration" }, new Date());
    if (!result.ok) return;
    onChange(result.property);
    toast.show(t.toastConfirmed);
  }

  function sendDocuments() {
    if (files.length === 0) {
      setProblems([t.documents.errors.missing]);
      return;
    }
    const found = describe(files);
    if (found.length > 0) {
      setProblems(found);
      return;
    }
    const result = requestVerification(
      property,
      { method: "document", documents: files },
      new Date(),
    );
    if (!result.ok) return;
    onChange(result.property);
    setFiles([]);
    setProblems([]);
    toast.show(t.toastSent);
  }

  function decide(decision: "confirmed" | "rejected") {
    const result = decideVerification(
      property,
      decision,
      decision === "rejected" ? t.rejectNote : undefined,
      new Date(),
    );
    if (result.ok) onChange(result.property);
  }

  if (status === "confirmed") {
    return (
      <section className={styles.card} aria-labelledby="verify-title">
        <h2 id="verify-title" className={styles.heading}>
          {t.confirmedTitle}
        </h2>
        <p>{t.confirmedText}</p>
      </section>
    );
  }

  if (status === "pending_check") {
    return (
      <section className={styles.card} aria-labelledby="verify-title">
        <h2 id="verify-title" className={styles.heading}>
          {t.pendingTitle}
        </h2>
        <p>{t.pendingText}</p>
        <p className={styles.note}>{t.sentFiles}</p>
        <ul className={styles.files}>
          {property.verification.documents.map((file) => (
            <li key={file.name} className={styles.file}>
              {file.name}
            </li>
          ))}
        </ul>
        <div className={styles.demo}>
          <p>{t.demoDecision}</p>
          <div className={styles.actions}>
            <Button onClick={() => decide("confirmed")}>{t.confirm}</Button>
            <Button variant="light" onClick={() => decide("rejected")}>
              {t.reject}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card} aria-labelledby="verify-title">
      <div>
        <h2 id="verify-title" className={styles.heading}>
          {status === "rejected" ? t.rejectedTitle : t.title}
        </h2>
        <p>
          {status === "rejected"
            ? format(t.rejectedText, { note: property.verification.note ?? "" })
            : t.unverifiedLead}
        </p>
      </div>

      <div className={styles.ways}>
        <div className={styles.way}>
          <h3 className={styles.wayTitle}>{t.state.title}</h3>
          <p>{t.state.text}</p>
          <p className={styles.demo}>{t.state.demo}</p>
          <div>
            <Button onClick={viaState}>{t.state.button}</Button>
          </div>
        </div>

        <div className={styles.way}>
          <h3 className={styles.wayTitle}>{t.documents.title}</h3>
          <p>{t.documents.text}</p>
          <Field
            label={t.documents.choose}
            hint={format(t.documents.hint, {
              size: megabytes(MAX_FILE_BYTES),
              count: MAX_FILES,
            })}
          >
            {(control) => (
              <input
                {...control}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={addFiles}
              />
            )}
          </Field>
          {files.length === 0 ? (
            <p className={styles.note}>{t.documents.none}</p>
          ) : (
            <ul className={styles.files}>
              {files.map((file, index) => {
                const size = sizeParts(file.size);
                return (
                  <li key={`${file.name}-${index}`} className={styles.file}>
                    <span>
                      {file.name} · {size.value}{" "}
                      {size.unit === "mb" ? t.documents.mb : t.documents.kb}
                    </span>
                    <button
                      type="button"
                      className={styles.remove}
                      onClick={() => removeFile(index)}
                    >
                      {format(t.documents.remove, { name: file.name })}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {problems.length > 0 && (
            <ul className={styles.problems} role="alert">
              {problems.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          )}
          <div>
            <Button onClick={sendDocuments}>{t.documents.send}</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
