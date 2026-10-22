import { useId, type ReactNode } from "react";
import styles from "@/shared/ui/cabinet/cabinet.module.css";

/** A titled block of fields. A `role="group"` with a heading draws cleanly where `fieldset` does not. */
export function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className={styles.group}>
      <h3 id={id} className={styles.legend}>
        {title}
      </h3>
      {children}
    </div>
  );
}
