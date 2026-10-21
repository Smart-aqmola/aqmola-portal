"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { situationIcons } from "@/features/catalog/ui/icons";
import { ServiceCard } from "@/features/catalog/ui/service-card";
import type { FavoriteLabels } from "@/features/favorites/ui/favorite-button";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { format } from "@/shared/i18n/format";
import { Icon } from "@/shared/ui/icon/icon";
import type { SituationGroup } from "../load-home";
import styles from "./situation-services.module.css";

type SituationServicesProps = {
  lang: Locale;
  title: string;
  groups: SituationGroup[];
  labels: Dictionary["home"]["situations"];
  serviceLabels: Dictionary["home"]["service"];
  favoriteLabels: FavoriteLabels;
};

/** Row of life situations; the selected one shows its popular services as cards. */
export function SituationServices({
  lang,
  title,
  groups,
  labels,
  serviceLabels,
  favoriteLabels,
}: SituationServicesProps) {
  const id = useId();
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const row = useRef<HTMLDivElement>(null);
  const active = groups[selected];

  function select(index: number) {
    const next = (index + groups.length) % groups.length;
    setSelected(next);
    tabRefs.current[next]?.focus();
  }

  function onKeyDown(event: KeyboardEvent, index: number) {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: groups.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(moves[event.key]);
  }

  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 className={styles.title} id={`${id}-title`}>
        {title}
      </h2>

      <div className={styles.tabsWrap}>
        <div className={styles.tabs} role="tablist" aria-labelledby={`${id}-title`} ref={row}>
          {groups.map((group, index) => (
            <button
              key={group.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${group.id}`}
              aria-selected={index === selected}
              aria-controls={`${id}-panel`}
              tabIndex={index === selected ? 0 : -1}
              className={styles.tab}
              onClick={() => setSelected(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <Icon name={situationIcons[group.id]} size={40} strokeWidth={1.3} />
              <span>{group.name}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.more}
          aria-label={labels.scrollMore}
          onClick={() =>
            row.current?.scrollBy?.({ left: row.current.clientWidth * 0.6, behavior: "smooth" })
          }
        >
          <Icon name="next" size={32} />
        </button>
      </div>

      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${active.id}`}
        className={styles.panel}
      >
        <div className={styles.panelHead}>
          <h3 className={styles.panelTitle}>{format(labels.popularIn, { name: active.name })}</h3>
          <Link href={`/${lang}/services?situation=${active.id}`} className={styles.all}>
            {labels.allServices}
          </Link>
        </div>
        <ul className={styles.cards}>
          {active.services.map((service) => (
            <li key={service.slug} className={styles.item}>
              <ServiceCard
                service={service}
                lang={lang}
                labels={serviceLabels}
                favoriteLabels={favoriteLabels}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
