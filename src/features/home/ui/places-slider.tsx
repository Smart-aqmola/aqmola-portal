"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { format } from "@/shared/i18n/format";
import { Button } from "@/shared/ui/button/button";
import { Icon } from "@/shared/ui/icon/icon";
import type { HomeSlide } from "../load-home";
import styles from "./places-slider.module.css";

type PlacesSliderProps = {
  lang: Locale;
  places: HomeSlide[];
  labels: Dictionary["home"]["slider"];
  allLabel: string;
};

/**
 * The places of the region, one at a time: its photo fills the block, the others wait as cards.
 * It never moves by itself (WCAG 2.2.2): only the arrows and the cards change the place.
 */
export function PlacesSlider({ lang, places, labels, allLabel }: PlacesSliderProps) {
  const [index, setIndex] = useState(0);
  const total = places.length;
  const place = places[index];
  const go = (step: number) => setIndex((index + step + total) % total);
  // The next places in order, wrapping round, so the first card is always "next".
  const others = Array.from({ length: total - 1 }, (_, n) => (index + n + 1) % total);

  return (
    <section className={styles.slider} aria-labelledby="places-title">
      {/* A new key restarts the fade, so each photo comes in softly over the dark block. */}
      <Image
        key={place.slug}
        src={place.photo.url}
        alt=""
        fill
        sizes="100vw"
        className={styles.photo}
      />
      <div className={styles.shade} aria-hidden="true" />

      <div className={`container ${styles.inner}`}>
        <div className={styles.text} aria-live="polite">
          <h2 id="places-title" className={styles.eyebrow}>
            {labels.title}
            <span className={styles.position}>
              {format(labels.position, { n: index + 1, total })}
            </span>
          </h2>
          <p className={styles.territory}>{place.territory}</p>
          <h3 className={styles.name}>{place.name}</h3>
          <p className={styles.summary}>{place.summary}</p>
          <div className={styles.actions}>
            <Button href={`/${lang}/tourism/${place.slug}`}>{labels.details}</Button>
            <Link href={`/${lang}/tourism`} className={styles.all}>
              {allLabel}
            </Link>
          </div>
        </div>

        <div className={styles.side}>
          <ul className={styles.cards}>
            {others.map((n) => {
              const item = places[n];
              return (
                <li key={item.slug}>
                  <button type="button" className={styles.card} onClick={() => setIndex(n)}>
                    <Image
                      src={item.photo.url}
                      alt=""
                      fill
                      sizes="(max-width: 600px) 40vw, 200px"
                      className={styles.cardPhoto}
                    />
                    <span className={styles.cardText}>
                      <span className={styles.cardName}>{item.name}</span>
                      <span className={styles.cardTerritory}>{item.territory}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className={styles.controls}>
            <button
              type="button"
              className={`${styles.arrow} ${styles.prev}`}
              aria-label={labels.prev}
              onClick={() => go(-1)}
            >
              <Icon name="next" size={22} />
            </button>
            <button
              type="button"
              className={styles.arrow}
              aria-label={labels.next}
              onClick={() => go(1)}
            >
              <Icon name="next" size={22} />
            </button>
            <span className={styles.dots} aria-hidden="true">
              {places.map((item, n) => (
                <span key={item.slug} className={styles.dot} data-active={n === index} />
              ))}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
