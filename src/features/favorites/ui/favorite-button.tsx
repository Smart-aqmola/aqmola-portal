"use client";

import { useState } from "react";
import { Icon } from "@/shared/ui/icon/icon";
import { useToast } from "@/shared/ui/toast/toast-provider";
import { useFavorites } from "./use-favorites";
import styles from "./favorite-button.module.css";

/** `add` and `remove` name the button; `added` and `removed` are the short messages after a click. */
export type FavoriteLabels = { add: string; remove: string; added: string; removed: string };

type FavoriteButtonProps = {
  slug: string;
  labels: FavoriteLabels;
  className?: string;
};

/** Heart that saves a service in this browser. No sign in needed. */
export function FavoriteButton({ slug, labels, className }: FavoriteButtonProps) {
  const { favorites, toggle } = useFavorites();
  const toast = useToast();
  const saved = favorites.includes(slug);
  // The heart pops only when the person adds it, not for hearts restored from the browser.
  const [pop, setPop] = useState(false);

  return (
    <button
      type="button"
      className={[styles.button, className].filter(Boolean).join(" ")}
      aria-pressed={saved}
      aria-label={saved ? labels.remove : labels.add}
      data-pop={pop || undefined}
      onClick={() => {
        setPop(!saved);
        toggle(slug);
        toast.show(saved ? labels.removed : labels.added);
      }}
      onAnimationEnd={() => setPop(false)}
    >
      <Icon name="heart" size={20} />
    </button>
  );
}
