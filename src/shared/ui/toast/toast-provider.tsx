"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./toast.module.css";

const LIFETIME_MS = 4000;
const MAX_VISIBLE = 3;

type Toast = { id: number; message: string };
type ToastApi = { show: (message: string) => void };

// Without a provider (for example in a small test) showing a message does nothing.
const ToastContext = createContext<ToastApi>({ show: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

/**
 * Short messages at the bottom of the screen. The live region is always in the page, because
 * screen readers only announce text that appears inside a region that was already there. It uses
 * role="log" rather than "status" so it does not clash with the page's own status messages.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const show = useCallback((message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message }].slice(-MAX_VISIBLE));
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, LIFETIME_MS);
    timers.current.add(timer);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.region} role="log" aria-live="polite">
        {toasts.map((toast) => (
          <p key={toast.id} className={styles.toast}>
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
