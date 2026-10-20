"use client";

import { useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { Icon } from "@/shared/ui/icon/icon";
import { themes } from "../domain/settings";
import { useDisplay } from "./use-display";
import styles from "./display-settings.module.css";

type DisplaySettingsProps = { labels: Dictionary["display"] };

/** A button with a small panel: theme, high contrast and large text. Saved in this browser. */
export function DisplaySettings({ labels }: DisplaySettingsProps) {
  const { settings, update, reset } = useDisplay();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      setOpen(false);
      button.current?.focus();
    }
  }

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }

  return (
    <div className={styles.wrap} onKeyDown={onKeyDown} onBlur={onBlur}>
      <button
        ref={button}
        type="button"
        className={styles.button}
        aria-expanded={open}
        aria-controls="display-panel"
        aria-label={labels.open}
        onClick={() => setOpen(!open)}
      >
        <Icon name="contrast" />
      </button>

      {open && (
        <div id="display-panel" role="group" aria-label={labels.title} className={styles.panel}>
          <h2 className={styles.title}>{labels.title}</h2>

          <fieldset className={styles.fieldset}>
            <legend>{labels.theme.label}</legend>
            {themes.map((theme) => (
              <label key={theme} className={styles.option}>
                <input
                  type="radio"
                  name="display-theme"
                  checked={settings.theme === theme}
                  onChange={() => update({ theme })}
                />
                <span>{labels.theme[theme]}</span>
              </label>
            ))}
          </fieldset>

          <label className={styles.option}>
            <input
              type="checkbox"
              checked={settings.contrast}
              onChange={(event) => update({ contrast: event.target.checked })}
            />
            <span>{labels.contrast}</span>
          </label>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={settings.large}
              onChange={(event) => update({ large: event.target.checked })}
            />
            <span>{labels.large}</span>
          </label>

          <button type="button" className={styles.reset} onClick={reset}>
            {labels.reset}
          </button>
        </div>
      )}
    </div>
  );
}
