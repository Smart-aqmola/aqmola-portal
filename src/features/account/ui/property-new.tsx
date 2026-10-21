"use client";

import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import type { AddressSuggestion } from "../domain/address-search";
import { AccountGate } from "./account-gate";
import { PropertyForm } from "./property-form";

type PropertyNewProps = {
  lang: Locale;
  labels: Dictionary["properties"];
  territories: { id: string; name: string }[];
  suggestions: readonly AddressSuggestion[];
};

/** The page "add an object": only for someone signed in, with the form inside. */
export function PropertyNew({ lang, labels, territories, suggestions }: PropertyNewProps) {
  return (
    <AccountGate
      lang={lang}
      here={`/${lang}/properties/new`}
      labels={labels.signInRequired}
      operatorNote={labels.operatorNote}
    >
      {(session) => (
        <PropertyForm
          lang={lang}
          session={session}
          labels={labels}
          territories={territories}
          suggestions={suggestions}
        />
      )}
    </AccountGate>
  );
}
