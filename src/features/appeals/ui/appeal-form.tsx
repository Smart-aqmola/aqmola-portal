"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { CONTRACT_SECTORS, type ContractSector } from "@/features/account/domain/availability";
import type { StoredFile } from "@/features/account/domain/property";
import { format } from "@/shared/i18n/format";
import { sameShapeAs, useDraftState } from "@/shared/lib/use-draft-state";
import { MAX_FILES, MAX_FILE_BYTES, megabytes, sizeParts } from "@/shared/lib/upload-rules";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import {
  MAX_DESCRIPTION,
  MIN_DESCRIPTION,
  WITH_VIOLATION,
  appealCategories,
  appealHasErrors,
  asksSector,
  createAppeal,
  emptyAppealInput,
  needsSector,
  responsibleOrganization,
  sectorOf,
  subcategories,
  validateAppeal,
  type Appeal,
  type AppealCategory,
  type AppealErrors,
  type AppealInput,
} from "../domain/appeal";
import { AppealsArea, type AppealsAreaProps, type AppealsContext } from "./appeals-area";
import styles from "./appeals.module.css";

/** The form "new appeal" (spec 11.2, 11.3). The organization is found from the topic and the address (11.4). */
export function AppealForm(props: AppealsAreaProps) {
  const { lang } = props;
  return (
    <AppealsArea {...props} here={`/${lang}/appeals/new`}>
      {(context) => <Form {...props} context={context} />}
    </AppealsArea>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={title} className={styles.group}>
      <h3 className={styles.legend}>{title}</h3>
      {children}
    </div>
  );
}

function Form({
  lang,
  dict,
  territories,
  providers,
  missing,
  context,
}: AppealsAreaProps & { context: AppealsContext }) {
  const { ownerId, properties, labelOf, phone, email, appeals } = context;
  const t = dict.appeals.form;
  const [input, setInput, clearDraft] = useDraftState<AppealInput>(
    "appeal",
    emptyAppealInput(phone, email),
    sameShapeAs(emptyAppealInput()),
  );
  const [territoryId, setTerritoryId] = useState("");
  const [errors, setErrors] = useState<AppealErrors>({});
  const [sent, setSent] = useState<Appeal>();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<AppealInput>) => setInput((current) => ({ ...current, ...patch }));
  const property = properties.find((item) => item.id === input.propertyId);
  const place = property
    ? {
        territoryId: property.territoryId,
        without: property.addressId ? (missing[property.addressId] ?? []) : [],
      }
    : territoryId
      ? { territoryId, without: [] }
      : undefined;
  const sector = sectorOf(input);
  const organization = responsibleOrganization(sector, place, providers, dict.appeals.regionOffice);
  // Without a category there is nothing to say yet about who gets the appeal.
  const known = input.category !== "" && input.subcategory !== "";

  function chooseCategory(value: string) {
    const category = value as AppealCategory | "";
    set({
      category,
      subcategory: category ? subcategories[category][0] : "",
      sector: "",
    });
  }

  function chooseProperty(id: string) {
    const found = properties.find((item) => item.id === id);
    set({ propertyId: id, address: found ? labelOf(found) : "" });
  }

  function attach(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []).map<StoredFile>((file) => ({
      name: file.name,
      size: file.size,
    }));
    event.target.value = "";
    if (picked.length > 0) set({ attachments: [...input.attachments, ...picked] });
  }

  function send() {
    const found = validateAppeal(input, new Date());
    setErrors(found);
    if (appealHasErrors(found)) return;
    const appeal = createAppeal(
      input,
      { id: crypto.randomUUID(), ownerId, organization },
      appeals.everyone(),
      new Date(),
    );
    appeals.add(appeal);
    clearDraft();
    setSent(appeal);
  }

  if (sent) {
    return (
      <section className={styles.card} aria-labelledby="appeal-sent">
        <h2 id="appeal-sent" className={styles.heading}>
          {t.sent.title}
        </h2>
        <p>{format(t.sent.number, { number: sent.number })}</p>
        <p>{format(t.sent.organization, { name: sent.organizationName })}</p>
        <p className={styles.note}>{t.sent.text}</p>
        <div className={styles.actions}>
          <Button href={`/${lang}/appeals/${sent.id}`}>{t.sent.open}</Button>
          <Button variant="light" href={`/${lang}/appeals`}>
            {t.sent.list}
          </Button>
        </div>
      </section>
    );
  }

  const e = t.errors;
  const addressError = errors.address ? e.address[errors.address] : undefined;
  const descriptionError = errors.description
    ? format(e.description[errors.description], { min: MIN_DESCRIPTION, max: MAX_DESCRIPTION })
    : undefined;
  const attachError = errors.attachments
    ? format(e.attachments[errors.attachments], {
        count: MAX_FILES,
        size: megabytes(MAX_FILE_BYTES),
      })
    : undefined;
  const subs = input.category ? subcategories[input.category] : [];
  const subLabels = (input.category ? dict.appeals.subcategories[input.category] : {}) as Record<
    string,
    string
  >;
  const violationAsked = input.category !== "" && WITH_VIOLATION.includes(input.category);

  return (
    <section className={styles.card} aria-labelledby="appeal-title">
      <div>
        <h2 id="appeal-title" className={styles.heading}>
          {t.title}
        </h2>
        <p className={styles.note}>{t.lead}</p>
      </div>

      <div className={styles.form}>
        <Group title={t.groups.subject}>
          <Field label={t.category} error={errors.category && e.category} required>
            {(control) => (
              <select
                {...control}
                value={input.category}
                onChange={(event) => chooseCategory(event.target.value)}
              >
                <option value="">{t.categoryPlaceholder}</option>
                {appealCategories.map((item) => (
                  <option key={item} value={item}>
                    {dict.appeals.categories[item]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t.subcategory} error={errors.subcategory && e.subcategory} required>
            {(control) => (
              <select
                {...control}
                value={input.subcategory}
                disabled={!input.category}
                onChange={(event) => set({ subcategory: event.target.value })}
              >
                <option value="">{t.subcategoryPlaceholder}</option>
                {subs.map((item) => (
                  <option key={item} value={item}>
                    {subLabels[item]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {asksSector(input.category) && (
            <Field
              label={t.sector}
              hint={needsSector(input.category) ? undefined : t.sectorHint}
              error={errors.sector && e.sector}
              required={needsSector(input.category)}
            >
              {(control) => (
                <select
                  {...control}
                  value={input.sector}
                  onChange={(event) => set({ sector: event.target.value as ContractSector | "" })}
                >
                  <option value="">{t.sectorPlaceholder}</option>
                  {CONTRACT_SECTORS.map((item) => (
                    <option key={item} value={item}>
                      {dict.appeals.sectors[item]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
        </Group>

        <Group title={t.groups.where}>
          <Field label={t.object}>
            {(control) => (
              <select
                {...control}
                value={input.propertyId}
                onChange={(event) => chooseProperty(event.target.value)}
              >
                <option value="">{t.otherAddress}</option>
                {properties.map((item) => (
                  <option key={item.id} value={item.id}>
                    {labelOf(item)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {!input.propertyId && (
            <Field label={t.territory}>
              {(control) => (
                <select
                  {...control}
                  value={territoryId}
                  onChange={(event) => setTerritoryId(event.target.value)}
                >
                  <option value="">{t.territoryPlaceholder}</option>
                  {territories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
          <Field label={t.address} hint={t.addressHint} error={addressError} required>
            {(control) => (
              <input
                {...control}
                autoComplete="street-address"
                value={input.address}
                onChange={(event) => set({ address: event.target.value })}
              />
            )}
          </Field>
          <Field
            label={t.description}
            hint={format(t.descriptionHint, { min: MIN_DESCRIPTION, max: MAX_DESCRIPTION })}
            error={descriptionError}
            required
          >
            {(control) => (
              <textarea
                {...control}
                rows={5}
                value={input.description}
                onChange={(event) => set({ description: event.target.value })}
              />
            )}
          </Field>
        </Group>

        {violationAsked && (
          <Group title={t.groups.violation}>
            <p className={styles.note}>{t.violationHint}</p>
            <div className={styles.pair}>
              <Field label={t.date} error={errors.violationDate && e.date[errors.violationDate]}>
                {(control) => (
                  <input
                    {...control}
                    type="date"
                    value={input.violationDate}
                    onChange={(event) => set({ violationDate: event.target.value })}
                  />
                )}
              </Field>
              <Field label={t.time} error={errors.violationTime && e.time}>
                {(control) => (
                  <input
                    {...control}
                    type="time"
                    value={input.violationTime}
                    onChange={(event) => set({ violationTime: event.target.value })}
                  />
                )}
              </Field>
            </div>
            <div className={styles.pair}>
              <Field label={t.duration} error={errors.duration && e.duration}>
                {(control) => (
                  <input
                    {...control}
                    inputMode="numeric"
                    value={input.duration}
                    onChange={(event) => set({ duration: event.target.value })}
                  />
                )}
              </Field>
              <Field label={t.unit}>
                {(control) => (
                  <select
                    {...control}
                    value={input.unit}
                    onChange={(event) => set({ unit: event.target.value as AppealInput["unit"] })}
                  >
                    <option value="hours">{t.hours}</option>
                    <option value="days">{t.days}</option>
                  </select>
                )}
              </Field>
            </div>
          </Group>
        )}

        <Group title={t.groups.contacts}>
          <div className={styles.pair}>
            <Field
              label={t.phone}
              error={errors.contactPhone && e.phone[errors.contactPhone]}
              required
            >
              {(control) => (
                <input
                  {...control}
                  type="tel"
                  autoComplete="tel"
                  value={input.contactPhone}
                  onChange={(event) => set({ contactPhone: event.target.value })}
                />
              )}
            </Field>
            <Field label={t.email} hint={t.emailHint} error={errors.contactEmail && e.email}>
              {(control) => (
                <input
                  {...control}
                  type="email"
                  autoComplete="email"
                  value={input.contactEmail}
                  onChange={(event) => set({ contactEmail: event.target.value })}
                />
              )}
            </Field>
          </div>
        </Group>

        <Group title={t.groups.files}>
          <p className={styles.note}>
            {format(t.attachHint, { size: megabytes(MAX_FILE_BYTES), count: MAX_FILES })}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            hidden
            aria-label={t.attachments}
            onChange={attach}
          />
          <div>
            <Button variant="light" onClick={() => fileRef.current?.click()}>
              {t.attachments}
            </Button>
          </div>
          {input.attachments.length > 0 && (
            <ul className={styles.slotList}>
              {input.attachments.map((file, index) => {
                const size = sizeParts(file.size);
                return (
                  <li key={`${file.name}-${index}`} className={styles.attached}>
                    <span>
                      {format(t.attached, {
                        name: file.name,
                        size: `${size.value} ${
                          size.unit === "mb"
                            ? dict.contracts.documents.mb
                            : dict.contracts.documents.kb
                        }`,
                      })}
                    </span>
                    <button
                      type="button"
                      className={styles.remove}
                      onClick={() =>
                        set({ attachments: input.attachments.filter((_, i) => i !== index) })
                      }
                    >
                      {format(t.remove, { name: file.name })}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {attachError && (
            <p className={styles.error} role="alert">
              {attachError}
            </p>
          )}
        </Group>
      </div>

      <p className={styles.note}>
        {known ? format(t.responsible, { name: organization.name }) : t.responsiblePending}
      </p>
      <div className={styles.actions}>
        <Button onClick={send}>{t.send}</Button>
      </div>
    </section>
  );
}
