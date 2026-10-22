"use client";

import { useEffect } from "react";
import { STORAGE_FAILED_EVENT } from "@/shared/lib/local-store";
import { useToast } from "@/shared/ui/toast/toast-provider";

/** Warns once per page when the browser refuses to keep data, instead of losing it silently. */
export function StorageNotice({ text }: { text: string }) {
  const toast = useToast();

  useEffect(() => {
    let told = false;
    const warn = () => {
      if (told) return;
      told = true;
      toast.show(text);
    };
    window.addEventListener(STORAGE_FAILED_EVENT, warn);
    return () => window.removeEventListener(STORAGE_FAILED_EVENT, warn);
  }, [toast, text]);

  return null;
}
