import Link from "next/link";
import type { Sector } from "@/features/catalog/domain/types";
import type { Locale } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/get-dictionary";
import { canOfferContract, servicesAtAddress, type ProviderInfo } from "../domain/availability";
import { canOrderServices, type Property } from "../domain/property";
import styles from "./account.module.css";

type PropertyServicesProps = {
  lang: Locale;
  property: Property;
  providers: readonly ProviderInfo[];
  /** Networks that a directory address does not have, by address id. */
  missing: Record<string, readonly Sector[]>;
  labels: Dictionary["properties"]["detail"]["services"];
};

/**
 * Who serves this address, utility by utility (spec 1.4, 3.7). Where nobody does, it says so
 * and offers no way to order (spec 1.5). Providers are links only for a confirmed object.
 */
export function PropertyServices({
  lang,
  property,
  providers,
  missing,
  labels,
}: PropertyServicesProps) {
  const without = property.addressId ? (missing[property.addressId] ?? []) : [];
  const services = servicesAtAddress({ territoryId: property.territoryId, without }, providers);
  const confirmed = canOrderServices(property);

  return (
    <section className={styles.card} aria-labelledby="services-title">
      <div>
        <h2 id="services-title" className={styles.heading}>
          {labels.title}
        </h2>
        <p className={styles.note}>{labels.lead}</p>
      </div>
      {!confirmed && <p className={styles.demo}>{labels.confirmFirst}</p>}

      <ul className={styles.sectors}>
        {services.map((service) => (
          <li key={service.sector} className={styles.sector} data-state={service.state}>
            <h3 className={styles.wayTitle}>{labels.sectors[service.sector]}</h3>
            {canOfferContract(service) ? (
              <>
                <p className={styles.note}>{labels.providers}</p>
                <ul className={styles.providers}>
                  {service.providers.map((provider) => (
                    <li key={provider.id} className={styles.provider}>
                      <span>{provider.name}</span>
                      {confirmed && (
                        <Link
                          href={`/${lang}/services?organization=${provider.id}&territory=${property.territoryId}`}
                          className={styles.open}
                        >
                          {labels.providerLink}
                          <span className="visually-hidden"> — {provider.name}</span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className={styles.unserved}>
                <strong>{labels.notServed}.</strong>{" "}
                {service.state === "no_network" ? labels.noNetwork : labels.noProvider}
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className={styles.note}>{labels.previousOwner}</p>
    </section>
  );
}
