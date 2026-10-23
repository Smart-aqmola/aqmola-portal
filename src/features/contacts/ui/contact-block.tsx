import type { Dictionary } from "@/shared/i18n/get-dictionary";
import type { OperatorContacts } from "../load-contacts";
import { FeedbackForm } from "./feedback-form";
import styles from "./contacts.module.css";

type Labels = Dictionary["contactsPage"];

/**
 * Contacts and "Any questions left?" side by side, as on astana.kz: on the left a map with the card
 * of the operator, on the right the form. The map is a drawn scheme; the link opens a real one.
 */
export function ContactBlock({ labels, operator }: { labels: Labels; operator: OperatorContacts }) {
  return (
    <section className={styles.block}>
      <div className={styles.map}>
        <MapScheme />
        <div className={styles.card}>
          <p className={styles.org}>{operator.name}</p>
          <dl className={styles.facts}>
            <div>
              <dt>{labels.phone}</dt>
              <dd>
                {operator.phones.map((phone) => (
                  <a key={phone} href={`tel:${phone.replace(/[^\d+]/g, "")}`}>
                    {phone}
                  </a>
                ))}
              </dd>
            </div>
            <div>
              <dt>{labels.email}</dt>
              <dd>
                <a href={`mailto:${operator.email}`}>{operator.email}</a>
              </dd>
            </div>
            <div>
              <dt>{labels.address}</dt>
              <dd>{operator.address}</dd>
            </div>
            <div>
              <dt>{labels.hours}</dt>
              <dd>{operator.hours}</dd>
            </div>
          </dl>
          <a
            href={operator.mapHref}
            className={styles.mapLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            {labels.openMap}
          </a>
        </div>
      </div>
      <div className={styles.formSide}>
        <FeedbackForm labels={labels.form} />
      </div>
    </section>
  );
}

/** A quiet street scheme with a pin; it carries no information of its own. */
function MapScheme() {
  return (
    <svg
      className={styles.scheme}
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="400" height="300" className={styles.ground} />
      <g className={styles.blocks}>
        <rect x="20" y="20" width="110" height="70" rx="6" />
        <rect x="150" y="20" width="90" height="70" rx="6" />
        <rect x="260" y="20" width="120" height="70" rx="6" />
        <rect x="20" y="115" width="70" height="80" rx="6" />
        <rect x="110" y="115" width="130" height="80" rx="6" />
        <rect x="260" y="115" width="60" height="80" rx="6" />
        <rect x="340" y="115" width="40" height="80" rx="6" />
        <rect x="20" y="220" width="160" height="60" rx="6" />
        <rect x="200" y="220" width="80" height="60" rx="6" />
        <rect x="300" y="220" width="80" height="60" rx="6" />
      </g>
      <g className={styles.roads}>
        <path d="M0 103h400M0 208h400M140 0v300M250 0v300" />
      </g>
      <path className={styles.park} d="M110 115h130v80H110z" />
      <g transform="translate(250 103)">
        <circle r="18" className={styles.pinHalo} />
        <path d="M0 6c-6-8-10-12-10-17a10 10 0 0 1 20 0c0 5-4 9-10 17z" className={styles.pin} />
        <circle cy="-11" r="3.5" className={styles.pinDot} />
      </g>
    </svg>
  );
}
