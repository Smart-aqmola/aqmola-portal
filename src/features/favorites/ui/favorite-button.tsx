"use client";

import { Icon } from "@/shared/ui/icon/icon";
import { useFavorites } from "./use-favorites";
import styles from "./favorite-button.module.css";

type FavoriteButtonProps = {
  slug: string;
  labels: { add: string; remove: string };
  className?: string;
};

/** Heart that saves a service in this browser. No sign in needed. */
export function FavoriteButton({ slug, labels, className }: FavoriteButtonProps) {
  const { favorites, toggle } = useFavorites();
  const saved = favorites.includes(slug);

  return (
    <button
      type="button"
      className={[styles.button, className].filter(Boolean).join(" ")}
      aria-pressed={saved}
      aria-label={saved ? labels.remove : labels.add}
      onClick={() => toggle(slug)}
    >
      <Icon name="heart" size={20} />
    </button>
  );
}
