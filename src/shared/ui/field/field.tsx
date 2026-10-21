import { useId, type ReactNode } from "react";
import styles from "./field.module.css";

/** What a control inside a `Field` must receive so the label, hint and error belong to it. */
export type FieldControlProps = {
  id: string;
  className: string;
  "aria-invalid": boolean;
  "aria-required": boolean;
  "aria-describedby": string | undefined;
};

type FieldProps = {
  label: string;
  hint?: string;
  /** Already in the person's language; the field shows it and tells screen readers about it. */
  error?: string;
  required?: boolean;
  children: (control: FieldControlProps) => ReactNode;
};

/** One labelled form control with an optional hint and error message. */
export function Field({ label, hint, error, required = false, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && (
          <span className={styles.star} aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children({
        id,
        className: styles.input,
        "aria-invalid": Boolean(error),
        "aria-required": required,
        "aria-describedby": describedBy || undefined,
      })}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type CheckFieldProps = {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
};

/** A checkbox with its text; the whole line is the tap target. */
export function CheckField({ label, checked, onChange, error }: CheckFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.check}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
