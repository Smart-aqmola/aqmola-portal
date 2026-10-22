"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { StoredFile } from "@/features/account/domain/property";
import { useProfiles } from "@/features/account/ui/use-profiles";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { sameShapeAs, useDraftState } from "@/shared/lib/use-draft-state";
import { MAX_FILES, MAX_FILE_BYTES, megabytes } from "@/shared/lib/upload-rules";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import { isActive, meterResources, type MeterResource } from "../domain/meter";
import {
  MAX_COMMENT,
  MAX_DAYS_AHEAD,
  MAX_SLOTS,
  createRequest,
  emptyRequestInput,
  requestForms,
  requestHasErrors,
  timeSlots,
  validateRequest,
  type DetailKey,
  type MeterRequest,
  type RequestErrors,
  type RequestInput,
  type RequestKind,
  type Slot,
} from "../domain/meter-request";
import { Group } from "./group";
import { MetersArea, pathFor, type MetersContext, type MetersDict } from "./meters-area";
import { fileSize, meterLabel } from "./meter-texts";
import styles from "@/shared/ui/cabinet/cabinet.module.css";

type RequestFormProps = {
  lang: Locale;
  dict: MetersDict;
  territories: { id: string; name: string }[];
  kind: RequestKind;
  preset: { property?: string; meter?: string };
};

/** One of the six forms for work on a meter (spec 8.2–8.6); they differ only in the fields they ask. */
export function RequestForm(props: RequestFormProps) {
  const { lang, dict, territories, kind } = props;
  return (
    <MetersArea
      lang={lang}
      dict={dict}
      territories={territories}
      current={kind}
      here={pathFor(lang, kind)}
    >
      {(context) => <Form key={kind} {...props} context={context} />}
    </MetersArea>
  );
}

const DETAIL_ROWS: Record<DetailKey, "text" | "area" | "date"> = {
  newMeter: "area",
  faultInfo: "area",
  previousSeal: "text",
  installedAt: "date",
  plannedWork: "area",
  lastVerifiedAt: "date",
  nextVerificationAt: "date",
};

function Form({
  lang,
  dict,
  kind,
  preset,
  context,
}: RequestFormProps & { context: MetersContext }) {
  const { session, ownerId, properties, labelOf, data } = context;
  const t = dict.meters.request;
  const form = requestForms[kind];
  const title = dict.meters.nav[kind];
  const { profiles } = useProfiles();
  const phone = profiles.find((item) => item.id === session.userId)?.phone ?? "";

  const active = data.meters.filter(isActive);
  const fromPreset = active.find((item) => item.id === preset.meter);
  const startProperty =
    fromPreset?.propertyId ??
    properties.find((item) => item.id === preset.property)?.id ??
    (properties.length === 1 ? properties[0].id : "");

  const [input, setInput, clearDraft] = useDraftState<RequestInput>(
    `request-${kind}`,
    {
      ...emptyRequestInput(kind, phone),
      propertyId: startProperty,
      resource: fromPreset?.resource ?? "",
      meterId: fromPreset?.id ?? "",
    },
    sameShapeAs(emptyRequestInput(kind)),
  );
  const [errors, setErrors] = useState<RequestErrors>({});
  const [sent, setSent] = useState<MeterRequest>();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<RequestInput>) => setInput((current) => ({ ...current, ...patch }));
  const meters = active.filter(
    (item) => item.propertyId === input.propertyId && item.resource === input.resource,
  );
  const meter = meters.find((item) => item.id === input.meterId);
  const property = properties.find((item) => item.id === input.propertyId);

  function chooseProperty(id: string) {
    set({ propertyId: id, resource: "", meterId: "" });
  }

  function chooseResource(value: string) {
    const next = value as MeterResource | "";
    const found = active.filter(
      (item) => item.propertyId === input.propertyId && item.resource === next,
    );
    set({
      resource: next,
      meterId: found.length === 1 && form.meter !== "optional" ? found[0].id : "",
    });
  }

  function chooseMeter(id: string) {
    const found = meters.find((item) => item.id === id);
    const details = { ...input.details };
    // What the card of the meter already knows is filled in, but can be changed (spec 8.4, 8.6).
    if (found) {
      if (found.installedAt) details.installedAt = found.installedAt;
      if (found.lastVerifiedAt) details.lastVerifiedAt = found.lastVerifiedAt;
      if (found.nextVerificationAt) details.nextVerificationAt = found.nextVerificationAt;
    }
    set({ meterId: id, details });
  }

  function setDetail(key: DetailKey, value: string) {
    set({ details: { ...input.details, [key]: value } });
  }

  function setSlot(index: number, patch: Partial<Slot>) {
    set({ slots: input.slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)) });
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
    const found = validateRequest(input, new Date(), meter);
    setErrors(found);
    if (requestHasErrors(found) || !property) return;
    const request = createRequest(
      input,
      { id: crypto.randomUUID(), ownerId, address: labelOf(property) },
      data.allRequests(),
      new Date(),
    );
    data.addRequest(request);
    clearDraft();
    setSent(request);
  }

  function again() {
    setSent(undefined);
    setErrors({});
    setInput({ ...emptyRequestInput(kind, phone), propertyId: input.propertyId });
  }

  if (sent) {
    return (
      <section className={styles.card} aria-labelledby="request-sent">
        <h2 id="request-sent" className={styles.heading}>
          {t.sent.title}
        </h2>
        <p>{format(t.sent.number, { number: sent.number })}</p>
        <p className={styles.note}>{t.sent.text}</p>
        <div className={styles.actions}>
          <Button href={`/${lang}/meters/requests/${sent.id}`}>{t.sent.open}</Button>
          <Button variant="light" onClick={again}>
            {t.sent.another}
          </Button>
        </div>
      </section>
    );
  }

  const detailError = (key: DetailKey) => {
    const code = errors.details?.[key];
    return code ? t.errors.detail[code] : undefined;
  };
  const readingError = errors.currentReading
    ? format(dict.meters.valueErrors[errors.currentReading], {
        digits: meter?.digits ?? 8,
        decimals: meter?.decimals ?? 3,
      })
    : undefined;
  const slotError = errors.slots
    ? format(t.errors.slots[errors.slots], { days: MAX_DAYS_AHEAD })
    : undefined;
  const attachError = errors.attachments
    ? format(t.errors.attachments[errors.attachments], {
        count: MAX_FILES,
        size: megabytes(MAX_FILE_BYTES),
      })
    : undefined;
  const phoneError = errors.contactPhone ? t.errors.phone[errors.contactPhone] : undefined;

  return (
    <section className={styles.card} aria-labelledby="request-title">
      <div>
        <h2 id="request-title" className={styles.heading}>
          {title}
        </h2>
        <p className={styles.note}>{dict.meters.request.forms[kind].lead}</p>
      </div>

      <div className={styles.form}>
        <Group title={t.groups.object}>
          <Field
            label={dict.meters.common.property}
            error={errors.propertyId && t.errors.property}
            required
          >
            {(control) => (
              <select
                {...control}
                value={input.propertyId}
                onChange={(event) => chooseProperty(event.target.value)}
              >
                <option value="">{dict.meters.common.propertyPlaceholder}</option>
                {properties.map((item) => (
                  <option key={item.id} value={item.id}>
                    {labelOf(item)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field
            label={dict.meters.common.service}
            error={errors.resource && t.errors.resource}
            required
          >
            {(control) => (
              <select
                {...control}
                value={input.resource}
                disabled={!input.propertyId}
                onChange={(event) => chooseResource(event.target.value)}
              >
                <option value="">{dict.meters.common.servicePlaceholder}</option>
                {(form.meter === "optional"
                  ? meterResources
                  : meterResources.filter((item) =>
                      active.some(
                        (meterItem) =>
                          meterItem.propertyId === input.propertyId && meterItem.resource === item,
                      ),
                    )
                ).map((item) => (
                  <option key={item} value={item}>
                    {dict.meters.resources[item]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {form.meter !== "none" && (
            <Field
              label={form.meter === "optional" ? t.existingMeter : dict.meters.common.meter}
              error={errors.meterId && t.errors.meter}
              required={form.meter === "required"}
            >
              {(control) => (
                <select
                  {...control}
                  value={input.meterId}
                  disabled={!input.resource}
                  onChange={(event) => chooseMeter(event.target.value)}
                >
                  <option value="">
                    {form.meter === "optional"
                      ? t.noExistingMeter
                      : dict.meters.common.meterPlaceholder}
                  </option>
                  {meters.map((item) => (
                    <option key={item.id} value={item.id}>
                      {meterLabel(item, dict)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
        </Group>

        <Group title={t.groups.reason}>
          <Field label={t.reasonLabel} error={errors.reason && t.errors.reason} required>
            {(control) => (
              <select
                {...control}
                value={input.reason}
                onChange={(event) => set({ reason: event.target.value })}
              >
                <option value="">{t.reasonPlaceholder}</option>
                {form.reasons.map((item) => (
                  <option key={item} value={item}>
                    {t.reasons[item as keyof typeof t.reasons]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {form.details.map((spec) => {
            const label = t.details[spec.key];
            const value = input.details[spec.key] ?? "";
            const hint =
              spec.key in t.detailHints
                ? t.detailHints[spec.key as keyof typeof t.detailHints]
                : undefined;
            return (
              <Field
                key={spec.key}
                label={label}
                hint={hint}
                error={detailError(spec.key)}
                required={spec.required}
              >
                {(control) =>
                  DETAIL_ROWS[spec.key] === "area" ? (
                    <textarea
                      {...control}
                      rows={3}
                      value={value}
                      onChange={(event) => setDetail(spec.key, event.target.value)}
                    />
                  ) : (
                    <input
                      {...control}
                      type={DETAIL_ROWS[spec.key] === "date" ? "date" : "text"}
                      value={value}
                      onChange={(event) => setDetail(spec.key, event.target.value)}
                    />
                  )
                }
              </Field>
            );
          })}
          {form.reading !== "none" && (
            <Field
              label={t.currentReading}
              error={readingError}
              required={form.reading === "required"}
            >
              {(control) => (
                <input
                  {...control}
                  inputMode="decimal"
                  autoComplete="off"
                  value={input.currentReading}
                  onChange={(event) => set({ currentReading: event.target.value })}
                />
              )}
            </Field>
          )}
        </Group>

        <Group title={t.slots}>
          {input.slots.map((slot, index) => (
            <div key={index} className={styles.slot}>
              <Field label={format(t.slotDate, { n: index + 1 })} required={index === 0}>
                {(control) => (
                  <input
                    {...control}
                    type="date"
                    value={slot.date}
                    onChange={(event) => setSlot(index, { date: event.target.value })}
                  />
                )}
              </Field>
              <Field label={format(t.slotTime, { n: index + 1 })}>
                {(control) => (
                  <select
                    {...control}
                    value={slot.time}
                    onChange={(event) =>
                      setSlot(index, { time: event.target.value as Slot["time"] })
                    }
                  >
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>
                        {t.times[time]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              {index > 0 && (
                <div>
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => set({ slots: input.slots.filter((_, i) => i !== index) })}
                  >
                    {format(t.removeSlot, { n: index + 1 })}
                  </button>
                </div>
              )}
            </div>
          ))}
          {slotError && (
            <p className={styles.error} role="alert">
              {slotError}
            </p>
          )}
          {input.slots.length < MAX_SLOTS && (
            <div>
              <Button
                variant="light"
                onClick={() => set({ slots: [...input.slots, { date: "", time: "morning" }] })}
              >
                {t.addSlot}
              </Button>
            </div>
          )}
        </Group>

        <Group title={t.groups.contact}>
          <Field label={t.contactPhone} hint={t.contactHint} error={phoneError} required>
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
          <Field
            label={t.comment}
            error={errors.comment && format(t.errors.comment, { max: MAX_COMMENT })}
          >
            {(control) => (
              <textarea
                {...control}
                rows={3}
                value={input.comment}
                onChange={(event) => set({ comment: event.target.value })}
              />
            )}
          </Field>
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
              {input.attachments.map((file, index) => (
                <li key={`${file.name}-${index}`} className={styles.attached}>
                  <span>
                    {format(t.attached, {
                      name: file.name,
                      size: fileSize(file.size, dict.contracts.documents),
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
              ))}
            </ul>
          )}
          {attachError && (
            <p className={styles.error} role="alert">
              {attachError}
            </p>
          )}
        </Group>
      </div>

      <div className={styles.actions}>
        <Button onClick={send}>{t.send}</Button>
      </div>
    </section>
  );
}
