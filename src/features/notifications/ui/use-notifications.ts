"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useProfiles } from "@/features/account/ui/use-profiles";
import { useProperties } from "@/features/account/ui/use-properties";
import { useAppeals } from "@/features/appeals/ui/use-appeals";
import { isStaffRole } from "@/features/applications/domain/application";
import { ownerIdOf, type DemoSession } from "@/features/applications/domain/storage";
import { useApplications } from "@/features/applications/ui/use-applications";
import { usePayments } from "@/features/billing/ui/use-payments";
import { useContracts } from "@/features/contracts/ui/use-contracts";
import { useMeterData } from "@/features/meters/ui/use-meter-data";
import { createLocalStore } from "@/shared/lib/local-store";
import { buildNotifications, unreadOf, type AppNotification } from "../domain/notifications";
import { READ_KEY, markRead, parseReadState, type ReadState } from "../domain/read-state";

const EMPTY: ReadState = {};
const store = createLocalStore<ReadState>({ key: READ_KEY, parse: parseReadState, empty: EMPTY });
const NONE: AppNotification[] = [];

/**
 * The notices of one person and which of them are new (spec 16.1, 16.4). Residents and business
 * get them; a guest and an operator get none.
 */
export function useNotifications(session: DemoSession | null) {
  const wanted = session !== null && !isStaffRole(session.role);
  const ownerId = wanted ? ownerIdOf(session) : null;
  const { mine: properties } = useProperties(ownerId);
  const { applications } = useApplications();
  const { mine: contracts } = useContracts(ownerId);
  const { meters, readings, requests } = useMeterData(ownerId);
  const { mine: payments } = usePayments(ownerId);
  const { mine: appeals } = useAppeals(ownerId);
  const { profiles } = useProfiles();
  const readState = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const [now] = useState(() => new Date());

  const profile = session?.userId ? profiles.find((item) => item.id === session.userId) : undefined;
  const role = session?.role;

  const all = useMemo(() => {
    if (!wanted) return NONE;
    return buildNotifications(
      {
        ...(profile ? { profile } : {}),
        properties,
        applications: applications.filter((item) => item.ownerRole === role),
        contracts,
        meters,
        readings,
        requests,
        payments,
        appeals,
      },
      now,
    );
  }, [
    wanted,
    profile,
    properties,
    applications,
    role,
    contracts,
    meters,
    readings,
    requests,
    payments,
    appeals,
    now,
  ]);

  const readUpTo = ownerId ? readState[ownerId] : undefined;
  const unread = useMemo(() => unreadOf(all, readUpTo), [all, readUpTo]);

  /** Marks everything shown so far as read. */
  const markAllRead = useCallback(() => {
    if (!ownerId) return;
    const newest = all[0]?.at ?? "";
    const at = newest > new Date().toISOString() ? newest : new Date().toISOString();
    store.write(markRead(store.getSnapshot(), ownerId, at));
  }, [ownerId, all]);

  return { all, unread, readUpTo, markAllRead };
}
