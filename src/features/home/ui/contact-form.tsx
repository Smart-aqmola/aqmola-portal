"use client";

import { useState, type FormEvent } from "react";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Button } from "@/shared/ui/button/button";
import styles from "./contact-form.module.css";

type ContactFormProps = {
  labels: Dictionary["home"]["contact"];
};

/** A demo form: it never sends anything and asks for no phone number or e-mail on purpose. */
export function ContactForm({ labels }: ContactFormProps) {
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.currentTarget.reset();
    setSent(true);
  }

  return (
    <section className={styles.section} aria-labelledby="contact-title">
      <h2 className={styles.title} id="contact-title">
        {labels.title}
      </h2>
      <p className={styles.note}>{labels.demoNote}</p>
      <form className={styles.form} onSubmit={onSubmit} onChange={() => setSent(false)}>
        <label className={styles.label}>
          {labels.name}
          <input name="name" type="text" autoComplete="off" className={styles.input} />
        </label>
        <label className={styles.label}>
          {labels.message}
          <textarea name="message" rows={4} required className={styles.input} />
        </label>
        <Button type="submit">{labels.submit}</Button>
      </form>
      <p className={styles.sent} role="status">
        {sent ? labels.sent : ""}
      </p>
    </section>
  );
}
