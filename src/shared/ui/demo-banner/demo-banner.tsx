import styles from "./demo-banner.module.css";

/** Permanent notice that the portal is a test version with fictional data. */
export function DemoBanner({ text }: { text: string }) {
  return (
    <p className={styles.banner} role="note">
      {text}
    </p>
  );
}
