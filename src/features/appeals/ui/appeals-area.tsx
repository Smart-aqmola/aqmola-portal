"use client";

import type { ReactNode } from "react";
import type { ProviderInfo } from "@/features/account/domain/availability";
import { addressLine, type Property } from "@/features/account/domain/property";
import { AccountGate } from "@/features/account/ui/account-gate";
import { AccountNav } from "@/features/account/ui/account-nav";
import { useProfiles } from "@/features/account/ui/use-profiles";
import { useProperties } from "@/features/account/ui/use-properties";
import { ownerIdOf } from "@/features/applications/domain/storage";
import type { Sector } from "@/features/catalog/domain/types";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { useAppeals } from "./use-appeals";

/** `contracts` is here only for the words "KB" and "MB" next to file sizes. */
export type AppealsDict = Pick<
  Dictionary,
  "appeals" | "properties" | "account" | "contracts" | "list"
>;

export type AppealsContext = {
  ownerId: string;
  /** Every object of the person: an appeal may be about an object that is not confirmed yet. */
  properties: Property[];
  labelOf: (property: Property) => string;
  phone: string;
  email: string;
  appeals: ReturnType<typeof useAppeals>;
};

export type AppealsAreaProps = {
  lang: Locale;
  dict: AppealsDict;
  territories: { id: string; name: string }[];
  providers: readonly ProviderInfo[];
  /** Networks that a directory address does not have, by address id. */
  missing: Record<string, readonly Sector[]>;
};

type Props = AppealsAreaProps & {
  /** Where to come back to after signing in. */
  here: string;
  children: (context: AppealsContext) => ReactNode;
};

/** Sign-in check, the menu of the cabinet and what every part needs: objects, contacts, appeals. */
export function AppealsArea({ lang, dict, territories, here, children }: Props) {
  return (
    <AccountGate
      lang={lang}
      here={here}
      labels={dict.appeals.signInRequired}
      operatorNote={dict.appeals.operatorNote}
    >
      {(session) => (
        <>
          <AccountNav lang={lang} labels={dict.account.nav} current="appeals" />
          <Content
            dict={dict}
            territories={territories}
            ownerId={ownerIdOf(session)}
            userId={session.userId}
          >
            {children}
          </Content>
        </>
      )}
    </AccountGate>
  );
}

function Content({
  dict,
  territories,
  ownerId,
  userId,
  children,
}: {
  dict: AppealsDict;
  territories: { id: string; name: string }[];
  ownerId: string;
  userId: string | undefined;
  children: (context: AppealsContext) => ReactNode;
}) {
  const { mine } = useProperties(ownerId);
  const { profiles } = useProfiles();
  const appeals = useAppeals(ownerId);
  const profile = profiles.find((item) => item.id === userId);
  const territoryName = (id: string) => territories.find((item) => item.id === id)?.name ?? "";
  const labelOf = (property: Property) =>
    addressLine(property, territoryName(property.territoryId), dict.properties.flat);

  return (
    <>
      {children({
        ownerId,
        properties: mine,
        labelOf,
        phone: profile?.phone ?? "",
        email: profile?.email ?? "",
        appeals,
      })}
    </>
  );
}
