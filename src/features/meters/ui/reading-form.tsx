"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import type { StoredFile } from "@/features/account/domain/property";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { MAX_FILE_BYTES, megabytes } from "@/shared/lib/upload-rules";
import { Button } from "@/shared/ui/button/button";
import { CheckField, Field } from "@/shared/ui/field/field";
import { isActive, parseReading, type Meter, type MeterResource } from "../domain/meter";
import {
  MAX_AGE_DAYS,
  PHOTO_REQUIRED,
  checkReading,
  demoRecognized,
  hasErrors,
  previousOf,
  submitReading,
  type Reading,
  type ReadingDraft,
} from "../domain/reading";
import { MetersArea, type MetersContext, type MetersDict } from "./meters-area";
import { day, fileSize, meterLabel, readingText } from "./meter-texts";
import { ReadingBadge } from "./status-badges";
import styles from "@/shared/ui/cabinet/cabinet.module.css";

type ReadingFormProps = {
  lang: Locale;
  dict: MetersDict;
  territories: { id: string; name: string }[];
  /** What the address asked for: a meter (the object and the service follow from it). */
  preset: { meter?: string };
};

/** The part "Send readings" (spec 7.1): object, service, meter, reading, date, photo, confirmation. */
export function ReadingForm(props: ReadingFormProps) {
  const { lang, dict, territories } = props;
  return (
    <MetersArea
      lang={lang}
      dict={dict}
      territories={territories}
      current="submit"
      here={`/${lang}/meters/submit`}
    >
      {(context) => <Form {...props} context={context} />}
    </MetersArea>
  );
}

const todayText = () => new Date().toISOString().slice(0, 10);

function Form({ lang, dict, preset, context }: ReadingFormProps & { context: MetersContext }) {
  const { ownerId, properties, labelOf, data } = context;
  const t = dict.meters.submit;
  const active = data.meters.filter(isActive);
  const fromPreset = active.find((item) => item.id === preset.meter);

  const [propertyId, setPropertyId] = useState(
    fromPreset?.propertyId ?? (properties.length === 1 ? properties[0].id : ""),
  );
  const [resource, setResource] = useState<MeterResource | "">(fromPreset?.resource ?? "");
  const [meterId, setMeterId] = useState(fromPreset?.id ?? "");
  const [valueText, setValueText] = useState("");
  const [readingDate, setReadingDate] = useState(todayText);
  const [photo, setPhoto] = useState<StoredFile>();
  const [recognitionDismissed, setRecognitionDismissed] = useState(false);
  const [authentic, setAuthentic] = useState(false);
  const [decreaseConfirmed, setDecreaseConfirmed] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [sent, setSent] = useState<Reading>();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const atObject = active.filter((item) => item.propertyId === propertyId);
  const resources = [...new Set(atObject.map((item) => item.resource))];
  const meters = atObject.filter((item) => item.resource === resource);
  const meter: Meter | undefined = meters.find((item) => item.id === meterId);

  const draft: ReadingDraft = { valueText, readingDate, photo, authentic, decreaseConfirmed };
  const errors =
    meter && attempted ? checkReading(meter, data.allReadings(), draft, new Date()) : {};
  const previous = meter ? previousOf(meter, data.allReadings()) : undefined;
  const typed = parseReading(valueText);
  const lowered = Boolean(previous && typed !== null && typed < previous.value);

  function chooseProperty(id: string) {
    setPropertyId(id);
    setResource("");
    setMeterId("");
    setAttempted(false);
  }

  function chooseResource(value: string) {
    const next = value as MeterResource | "";
    setResource(next);
    setAttempted(false);
    const found = active.filter((item) => item.propertyId === propertyId && item.resource === next);
    setMeterId(found.length === 1 ? found[0].id : "");
  }

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhoto({ name: file.name, size: file.size });
    setRecognitionDismissed(false);
  }

  function send() {
    setAttempted(true);
    if (!meter) return;
    const result = submitReading(
      meter,
      data.allReadings(),
      draft,
      { id: crypto.randomUUID(), ownerId },
      new Date(),
    );
    if (!result.ok) return;
    data.addReading(result.reading);
    setSent(result.reading);
  }

  function again() {
    setSent(undefined);
    setValueText("");
    setPhoto(undefined);
    setAuthentic(false);
    setDecreaseConfirmed(false);
    setAttempted(false);
    setReadingDate(todayText());
  }

  if (sent && meter) {
    return (
      <section className={styles.card} aria-labelledby="sent-title">
        <h2 id="sent-title" className={styles.heading}>
          {t.sent.title}
        </h2>
        <p>{format(t.sent.number, { number: sent.number })}</p>
        <p>
          {t.sent.status}:{" "}
          <ReadingBadge status={sent.status} label={dict.meters.status[sent.status]} />
        </p>
        {sent.status === "awaiting_check" && <p>{t.sent.check}</p>}
        <p className={styles.note}>{t.sent.text}</p>
        <div className={styles.actions}>
          <Button href={`/${lang}/meters/history`}>{t.sent.toHistory}</Button>
          <Button variant="light" onClick={again}>
            {t.sent.another}
          </Button>
        </div>
      </section>
    );
  }

  const valueError = errors.value
    ? format(dict.meters.valueErrors[errors.value], {
        digits: meter?.digits ?? 0,
        decimals: meter?.decimals ?? 0,
      })
    : undefined;
  const dateError = errors.date
    ? format(t.errors.date[errors.date], { days: MAX_AGE_DAYS })
    : undefined;
  const photoError = errors.photo
    ? format(t.errors.photo[errors.photo], {
        name: photo?.name ?? "",
        size: megabytes(MAX_FILE_BYTES),
      })
    : undefined;
  const recognized =
    photo && meter && previous && !recognitionDismissed && !valueText.trim()
      ? demoRecognized(previous.value, meter.decimals)
      : undefined;
  const fixable = hasErrors(errors) && !errors.decrease;
  const showDecrease = attempted && lowered && Boolean(errors.decrease || decreaseConfirmed);

  return (
    <section className={styles.card} aria-labelledby="submit-title">
      <div>
        <h2 id="submit-title" className={styles.heading}>
          {t.title}
        </h2>
        <p className={styles.note}>{t.lead}</p>
      </div>

      <div className={styles.form}>
        <Field label={dict.meters.common.property} required>
          {(control) => (
            <select
              {...control}
              value={propertyId}
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
          hint={propertyId ? undefined : dict.meters.common.pickPropertyFirst}
          required
        >
          {(control) => (
            <select
              {...control}
              value={resource}
              disabled={!propertyId}
              onChange={(event) => chooseResource(event.target.value)}
            >
              <option value="">{dict.meters.common.servicePlaceholder}</option>
              {resources.map((item) => (
                <option key={item} value={item}>
                  {dict.meters.resources[item]}
                </option>
              ))}
            </select>
          )}
        </Field>
        {propertyId && resources.length === 0 && (
          <p className={styles.note}>
            {dict.meters.common.noMeters}{" "}
            <Link href={`/${lang}/meters`} className={styles.open}>
              {dict.meters.common.addMeter}
            </Link>
          </p>
        )}

        <Field
          label={dict.meters.common.meter}
          hint={resource ? undefined : dict.meters.common.pickServiceFirst}
          required
        >
          {(control) => (
            <select
              {...control}
              value={meterId}
              disabled={!resource}
              onChange={(event) => {
                setMeterId(event.target.value);
                setAttempted(false);
              }}
            >
              <option value="">{dict.meters.common.meterPlaceholder}</option>
              {meters.map((item) => (
                <option key={item.id} value={item.id}>
                  {meterLabel(item, dict)}
                </option>
              ))}
            </select>
          )}
        </Field>

        {meter && previous && (
          <>
            <dl className={styles.facts}>
              <div>
                <dt>{t.previousValue}</dt>
                <dd>{readingText(previous.value, meter.decimals)}</dd>
              </div>
              <div>
                <dt>{t.previousDate}</dt>
                <dd>
                  {day(previous.date, lang, "")}
                  {data.readings.some((item) => item.meterId === meter.id)
                    ? ""
                    : ` (${t.initialNote})`}
                </dd>
              </div>
            </dl>

            <div className={styles.pair}>
              <Field
                label={t.value}
                hint={format(t.valueHint, { example: readingText(previous.value, meter.decimals) })}
                error={valueError}
                required
              >
                {(control) => (
                  <input
                    {...control}
                    inputMode="decimal"
                    autoComplete="off"
                    value={valueText}
                    onChange={(event) => setValueText(event.target.value)}
                  />
                )}
              </Field>
              <Field label={t.date} error={dateError} required>
                {(control) => (
                  <input
                    {...control}
                    type="date"
                    max={todayText()}
                    value={readingDate}
                    onChange={(event) => setReadingDate(event.target.value)}
                  />
                )}
              </Field>
            </div>

            <div className={styles.box}>
              <h3 className={styles.boxTitle}>
                {t.photo}
                {PHOTO_REQUIRED[meter.resource] ? " *" : ""}
              </h3>
              <p className={styles.note}>
                {PHOTO_REQUIRED[meter.resource] ? t.photoRequired : t.photoOptional}
              </p>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                aria-label={t.camera}
                onChange={pick}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                hidden
                aria-label={t.gallery}
                onChange={pick}
              />
              <div className={styles.fileButtons}>
                <Button variant="light" onClick={() => cameraRef.current?.click()}>
                  {t.camera}
                </Button>
                <Button variant="light" onClick={() => galleryRef.current?.click()}>
                  {t.gallery}
                </Button>
              </div>
              {photo && (
                <p className={styles.attached}>
                  <span>
                    {format(t.attached, {
                      name: photo.name,
                      size: fileSize(photo.size, dict.contracts.documents),
                    })}
                  </span>
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => setPhoto(undefined)}
                  >
                    {format(t.remove, { name: photo.name })}
                  </button>
                </p>
              )}
              {photoError && (
                <p className={styles.error} role="alert">
                  {photoError}
                </p>
              )}
            </div>

            {recognized && (
              <div className={styles.demo}>
                <strong>{t.recognition.title}</strong>
                <p>{format(t.recognition.text, { value: recognized })}</p>
                <div className={styles.actions}>
                  <Button
                    variant="light"
                    onClick={() => {
                      setValueText(recognized);
                      setRecognitionDismissed(true);
                    }}
                  >
                    {t.recognition.use}
                  </Button>
                  <Button variant="ghost" onClick={() => setRecognitionDismissed(true)}>
                    {t.recognition.dismiss}
                  </Button>
                </div>
              </div>
            )}

            {showDecrease && previous && typed !== null && (
              <div className={`${styles.box} ${styles.warn}`}>
                <h3 className={styles.boxTitle}>{t.decrease.title}</h3>
                <p>
                  {format(t.decrease.text, {
                    value: readingText(typed, meter.decimals),
                    previous: readingText(previous.value, meter.decimals),
                  })}
                </p>
                <CheckField
                  label={t.decrease.confirm}
                  checked={decreaseConfirmed}
                  onChange={setDecreaseConfirmed}
                />
              </div>
            )}

            <CheckField
              label={t.authentic}
              checked={authentic}
              onChange={setAuthentic}
              error={errors.authentic ? t.errors.authentic : undefined}
            />
            {errors.meter && (
              <p className={styles.error} role="alert">
                {t.errors.meter}
              </p>
            )}
            {fixable && (
              <p className={styles.problems} role="alert">
                {t.errors.form}
              </p>
            )}

            <div className={styles.actions}>
              <Button onClick={send}>{t.send}</Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
