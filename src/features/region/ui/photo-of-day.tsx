"use client";

import Image from "next/image";
import { useState } from "react";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Icon } from "@/shared/ui/icon/icon";
import { currencies, type Currency, type WeatherKind } from "../domain/signals";
import styles from "./my-region.module.css";

type Labels = Dictionary["myRegionPage"];

type PhotoOfDayProps = {
  lang: Locale;
  labels: Labels;
  today: string;
  weather: { temperature: number; kind: WeatherKind };
  rates: Record<Currency, number>;
  photos: { url: string; alt: string; name: string }[];
};

/**
 * "Photo of the day" with the date, the weather and the exchange rate on top (astana.kz/my-city).
 * The photos change only on a click: nothing moves by itself.
 */
export function PhotoOfDay({ lang, labels, today, weather, rates, photos }: PhotoOfDayProps) {
  const [index, setIndex] = useState(0);
  const [currency, setCurrency] = useState<Currency>("USD");
  const photo = photos[index];
  const date = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${today}T00:00:00Z`));
  const temperature = `${weather.temperature > 0 ? "+" : ""}${weather.temperature}°`;
  const rate = new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(rates[currency]);
  const step = (by: number) => setIndex((index + by + photos.length) % photos.length);

  return (
    <section className={styles.photoBox} aria-label={labels.photoOfDay}>
      <Image
        key={photo.url}
        src={photo.url}
        alt={photo.alt}
        fill
        priority
        sizes="(max-width: 900px) 100vw, 50vw"
        className={styles.photo}
      />
      <div className={styles.chips}>
        <span className={styles.chip}>{date}</span>
        <span className={styles.chip} title={labels.weatherLabel}>
          <span className="visually-hidden">{labels.weatherLabel}: </span>
          {temperature} · {labels.weather[weather.kind]}
        </span>
        <label className={styles.chip}>
          <span className="visually-hidden">{labels.currency}</span>
          <select
            className={styles.currency}
            value={currency}
            onChange={(event) => setCurrency(event.target.value as Currency)}
          >
            {currencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <span aria-live="polite">{format(labels.rate, { value: rate })}</span>
        </label>
      </div>
      <div className={styles.photoFoot}>
        <p className={styles.photoName}>
          <span className={styles.photoTag}>{labels.photoOfDay}</span>
          {photo.name}
        </p>
        <div className={styles.photoNav}>
          <button
            type="button"
            className={styles.round}
            aria-label={labels.prevPhoto}
            onClick={() => step(-1)}
          >
            <Icon name="next" size={18} className={styles.flip} />
          </button>
          <span className={styles.counter} aria-live="polite">
            {format(labels.photoN, { n: index + 1, total: photos.length })}
          </span>
          <button
            type="button"
            className={styles.round}
            aria-label={labels.nextPhoto}
            onClick={() => step(1)}
          >
            <Icon name="next" size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
