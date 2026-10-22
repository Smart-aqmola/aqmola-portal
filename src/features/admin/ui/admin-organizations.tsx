"use client";

import { useState } from "react";
import type { ProviderInfo } from "@/features/account/domain/availability";
import type { Locale } from "@/shared/i18n/config";
import { format } from "@/shared/i18n/format";
import { Button } from "@/shared/ui/button/button";
import { Field } from "@/shared/ui/field/field";
import {
  MAX_STAFF,
  staffRoles,
  type AdminConfig,
  type StaffMember,
  type StaffRole,
} from "../domain/config";
import { AdminArea, type AdminContext, type AdminDict } from "./admin-area";
import styles from "./admin-styles";

type Props = {
  lang: Locale;
  dict: AdminDict;
  providers: readonly ProviderInfo[];
  territories: { id: string; name: string }[];
};

/** Block an organization and manage the roles of its staff (spec 13.2). */
export function AdminOrganizations(props: Props) {
  return (
    <AdminArea lang={props.lang} dict={props.dict} current="organizations">
      {(context) => <Organizations {...props} context={context} />}
    </AdminArea>
  );
}

function Organizations({
  dict,
  providers,
  territories,
  context,
}: Props & { context: AdminContext }) {
  const t = dict.admin.organizations;
  const { config, save } = context;
  const [asking, setAsking] = useState<string>();

  const areaOf = (provider: ProviderInfo) =>
    provider.territories === "all"
      ? t.allArea
      : provider.territories
          .map((id) => territories.find((item) => item.id === id)?.name ?? id)
          .join(", ");
  const sectorName = (sector: string) =>
    (t.sectors as Record<string, string>)[sector] ?? t.sectors.other;

  function setBlocked(id: string, blocked: boolean) {
    const rest = config.blockedOrganizations.filter((item) => item !== id);
    save({ ...config, blockedOrganizations: blocked ? [...rest, id] : rest }, "organizations");
    setAsking(undefined);
  }

  return (
    <>
      <div>
        <h2 className={styles.sectionTitle}>{t.title}</h2>
        <p className={styles.note}>{t.lead}</p>
      </div>
      <ul className={styles.items}>
        {providers.map((provider) => {
          const blocked = config.blockedOrganizations.includes(provider.id);
          return (
            <li key={provider.id}>
              <article className={styles.item} aria-label={provider.name}>
                <div className={styles.detailHead}>
                  <h3 className={styles.itemTitle}>{provider.name}</h3>
                  <span className={styles.badge} data-tone={blocked ? "problem" : "done"}>
                    {blocked ? t.blocked : t.active}
                  </span>
                </div>
                <dl className={styles.facts}>
                  <div>
                    <dt>{t.fields.sector}</dt>
                    <dd>{sectorName(provider.sector)}</dd>
                  </div>
                  <div>
                    <dt>{t.fields.area}</dt>
                    <dd>{areaOf(provider)}</dd>
                  </div>
                </dl>
                {asking === provider.id ? (
                  <div className={styles.actionsBox} role="group" aria-label={t.block}>
                    <p>{format(t.confirmBlock, { org: provider.name })}</p>
                    <div className={styles.actions}>
                      <Button onClick={() => setBlocked(provider.id, true)}>{t.confirmYes}</Button>
                      <Button variant="light" onClick={() => setAsking(undefined)}>
                        {t.confirmNo}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {blocked ? (
                      <Button variant="light" onClick={() => setBlocked(provider.id, false)}>
                        {t.unblock}
                      </Button>
                    ) : (
                      <Button variant="light" onClick={() => setAsking(provider.id)}>
                        {t.block}
                      </Button>
                    )}
                  </div>
                )}
                <Staff
                  dict={dict}
                  organizationId={provider.id}
                  config={config}
                  onSave={(next) => save(next, "organizations")}
                />
              </article>
            </li>
          );
        })}
      </ul>
      <p className={styles.note}>{t.rolesNote}</p>
    </>
  );
}

function Staff({
  dict,
  organizationId,
  config,
  onSave,
}: {
  dict: AdminDict;
  organizationId: string;
  config: AdminConfig;
  onSave: (config: AdminConfig) => void;
}) {
  const t = dict.admin.organizations.staff;
  const roles = dict.admin.organizations.roles;
  const members = config.staff.filter((item) => item.organizationId === organizationId);
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("request_specialist");
  const [error, setError] = useState<string>();

  const change = (id: string, patch: Partial<StaffMember>) =>
    onSave({
      ...config,
      staff: config.staff.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });

  function add() {
    const clean = name.trim();
    if (!clean || clean.length > 80) {
      setError(t.errors.name);
      return;
    }
    if (config.staff.length >= MAX_STAFF) return;
    onSave({
      ...config,
      staff: [
        ...config.staff,
        { id: crypto.randomUUID(), organizationId, name: clean, role, blocked: false },
      ],
    });
    setName("");
    setError(undefined);
  }

  return (
    <details className={styles.details}>
      <summary>
        {t.title} ({members.length})
      </summary>
      <div className={styles.form}>
        {members.length === 0 ? (
          <p className={styles.note}>{t.empty}</p>
        ) : (
          <ul className={styles.items}>
            {members.map((member) => (
              <li key={member.id} className={styles.visit}>
                <strong>{member.name}</strong>
                <span className={styles.note}>
                  {dict.admin.organizations.roleHints[member.role]}
                </span>
                <Field label={`${t.role}: ${member.name}`}>
                  {(control) => (
                    <select
                      {...control}
                      value={member.role}
                      onChange={(event) =>
                        change(member.id, { role: event.target.value as StaffRole })
                      }
                    >
                      {staffRoles.map((item) => (
                        <option key={item} value={item}>
                          {roles[item]}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <div className={styles.actions}>
                  <Button
                    variant="light"
                    onClick={() => change(member.id, { blocked: !member.blocked })}
                  >
                    {member.blocked ? t.unblock : t.block}
                  </Button>
                  {member.blocked && (
                    <span className={styles.badge} data-tone="problem">
                      {t.blocked}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() =>
                      onSave({
                        ...config,
                        staff: config.staff.filter((item) => item.id !== member.id),
                      })
                    }
                  >
                    {t.remove}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.pair}>
          <Field label={t.name} error={error} required>
            {(control) => (
              <input {...control} value={name} onChange={(event) => setName(event.target.value)} />
            )}
          </Field>
          <Field label={t.role}>
            {(control) => (
              <select
                {...control}
                value={role}
                onChange={(event) => setRole(event.target.value as StaffRole)}
              >
                {staffRoles.map((item) => (
                  <option key={item} value={item}>
                    {roles[item]}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <div>
          <Button onClick={add}>{t.add}</Button>
        </div>
      </div>
    </details>
  );
}
