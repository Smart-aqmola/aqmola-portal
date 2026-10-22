"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";

const PREFIX = "aqmola:draft:";
const listeners = new Set<() => void>();
/** The parsed draft for the text last seen, so a read returns the same object until the text changes. */
const parsed = new Map<string, { raw: string; value: unknown }>();

const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

function readRaw(key: string): string | null {
  try {
    return window.sessionStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function read(key: string): unknown {
  const raw = readRaw(key);
  if (raw === null) return undefined;
  const known = parsed.get(key);
  if (known && known.raw === raw) return known.value;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    value = undefined;
  }
  parsed.set(key, { raw, value });
  return value;
}

function write(key: string, value: unknown) {
  try {
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // A full or blocked storage only means the draft is not kept; the form still works.
  }
  notify();
}

function remove(key: string) {
  try {
    window.sessionStorage.removeItem(PREFIX + key);
  } catch {
    // See `write`.
  }
  parsed.delete(key);
  notify();
}

/**
 * Form state that survives leaving the page and coming back, and above all a switch of language
 * (spec 18.9): the address changes from /ru/... to /kk/..., the page is built again, and the
 * typed text is put back. The draft lives in the tab only (session storage) and is dropped when
 * the form is sent. The server and the first render of the browser use `initial`, so they agree.
 *
 * `accept` checks what was stored; anything that does not fit is ignored, so a draft left by an
 * older version of the form cannot break it.
 */
export function useDraftState<T>(
  key: string,
  initial: T,
  accept: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const stored = useSyncExternalStore(
    subscribe,
    () => {
      const value = read(key);
      return accept(value) ? value : undefined;
    },
    () => undefined,
  );
  const value = stored ?? initial;

  // The setter reads the newest draft itself, so two changes made before a render do not overwrite
  // each other. What it needs from the last render is kept where it is not read during rendering.
  const latest = useRef({ initial, accept });
  useEffect(() => {
    latest.current = { initial, accept };
  });

  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      const { initial: first, accept: fits } = latest.current;
      const saved = read(key);
      const current = fits(saved) ? saved : first;
      write(key, typeof next === "function" ? (next as (current: T) => T)(current) : next);
    },
    [key],
  );

  /** Forgets the draft and starts again from the first values: the form was sent. */
  const clear = useCallback(() => remove(key), [key]);

  return [value, setValue, clear];
}

/** A check for `useDraftState`: the stored value has the same fields, of the same kinds, as the empty form. */
export function sameShapeAs<T extends object>(sample: T): (value: unknown) => value is T {
  return (value): value is T => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const stored = value as Record<string, unknown>;
    return Object.entries(sample).every(([name, example]) => {
      const found = stored[name];
      if (Array.isArray(example)) return Array.isArray(found);
      return typeof found === typeof example;
    });
  };
}
