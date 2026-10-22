"use client";

import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { downloadText } from "@/shared/lib/download-text";
import { Button } from "@/shared/ui/button/button";
import { hasContractText, type ContractApplication } from "../domain/contract";
import { applicationFileText, contractFileText, fileSize, receiptText } from "./contract-texts";
import styles from "./contracts-styles";

type ContractDocumentsProps = {
  app: ContractApplication;
  lang: Locale;
  dict: Pick<Dictionary, "contracts" | "properties">;
};

/** The documents of the application to download: the application, the confirmation, the contract, the attachments (spec 5.5). */
export function ContractDocuments({ app, lang, dict }: ContractDocumentsProps) {
  const t = dict.contracts.docs;
  const items = [
    {
      key: "application",
      label: t.application,
      file: "zayavlenie.txt",
      text: () => applicationFileText(app, dict, lang),
    },
    ...(app.number
      ? [
          {
            key: "receipt",
            label: t.receipt,
            file: "podtverzhdenie.txt",
            text: () => receiptText(app, dict, lang),
          },
        ]
      : []),
    ...(hasContractText(app.status)
      ? [
          {
            key: "contract",
            label: t.contract,
            file: "dogovor.txt",
            text: () => contractFileText(app, dict, lang),
          },
        ]
      : []),
  ];

  return (
    <section className={styles.card} aria-labelledby="documents-title">
      <div>
        <h2 id="documents-title" className={styles.heading}>
          {t.title}
        </h2>
        <p className={styles.note}>{t.lead}</p>
      </div>

      <ul className={styles.files}>
        {items.map((item) => (
          <li key={item.key} className={styles.fileRow}>
            <span>{item.label}</span>
            <Button variant="light" onClick={() => downloadText(item.file, item.text())}>
              {t.download}
              <span className="visually-hidden"> — {item.label}</span>
            </Button>
          </li>
        ))}
      </ul>

      <div>
        <h3 className={styles.wayTitle}>{t.attachments}</h3>
        {app.attachments.length === 0 ? (
          <p className={styles.note}>{t.none}</p>
        ) : (
          <ul className={styles.files}>
            {app.attachments.map((file) => (
              <li key={file.key} className={styles.fileRow}>
                <span>
                  {dict.contracts.documents.names[file.key]}: {file.name} ·{" "}
                  {fileSize(file.size, dict)}
                </span>
                <Button
                  variant="light"
                  onClick={() =>
                    downloadText(
                      file.name,
                      format(t.stub, {
                        name: file.name,
                        type: dict.contracts.documents.names[file.key],
                      }),
                    )
                  }
                >
                  {format(t.downloadFile, { name: file.name })}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
