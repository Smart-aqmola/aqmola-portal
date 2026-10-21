"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { format } from "@/shared/i18n/format";
import { Field } from "@/shared/ui/field/field";
import { filterAddresses, type AddressSuggestion } from "../domain/address-search";
import styles from "./account.module.css";

type AddressSearchProps = {
  suggestions: readonly AddressSuggestion[];
  labels: { search: string; searchHint: string; searchCount: string; searchNone: string };
  onSelect: (suggestion: AddressSuggestion) => void;
};

/**
 * Search in the address directory with a list of variants to pick from (spec 3.2). It is a
 * combobox: arrows move through the variants, Enter picks one, Escape closes the list.
 */
export function AddressSearch({ suggestions, labels, onSelect }: AddressSearchProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const results = useMemo(() => filterAddresses(suggestions, query), [suggestions, query]);
  const expanded = open && results.length > 0;
  const nothing = open && query.trim() !== "" && results.length === 0;
  const optionId = (index: number) => `${listId}-option-${index}`;

  function choose(item: AddressSuggestion) {
    onSelect(item);
    setQuery(item.label);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (results.length === 0) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => {
        if (current === -1) return step === 1 ? 0 : results.length - 1;
        return (current + step + results.length) % results.length;
      });
    } else if (event.key === "Enter" && expanded && active >= 0) {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  const announcement = !open
    ? ""
    : results.length > 0
      ? format(labels.searchCount, { count: results.length })
      : nothing
        ? labels.searchNone
        : "";

  return (
    <div className={styles.search}>
      <Field label={labels.search} hint={labels.searchHint}>
        {(control) => (
          <input
            {...control}
            role="combobox"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
          />
        )}
      </Field>
      <ul id={listId} role="listbox" className={styles.options} hidden={!expanded}>
        {results.map((item, index) => (
          <li
            key={item.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            className={styles.option}
            // Keep the focus in the field, or the list would close before the click arrives.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(item)}
          >
            {item.label}
          </li>
        ))}
      </ul>
      <div className="visually-hidden" aria-live="polite">
        {announcement}
      </div>
      {nothing && <p className={styles.note}>{labels.searchNone}</p>}
    </div>
  );
}
