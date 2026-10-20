import type { ReactNode } from "react";
import styles from "./card.module.css";

type CardProps = {
  as?: "div" | "article" | "section" | "li";
  padding?: "md" | "lg";
  className?: string;
  children: ReactNode;
};

/** White raised surface used for services, places and panels. */
export function Card({ as: Tag = "div", padding = "md", className, children }: CardProps) {
  return (
    <Tag className={[styles.card, className].filter(Boolean).join(" ")} data-padding={padding}>
      {children}
    </Tag>
  );
}
