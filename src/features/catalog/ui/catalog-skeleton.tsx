import styles from "./catalog-skeleton.module.css";

/** Grey placeholder shaped like the catalog page, shown while the page streams in. */
export function CatalogSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true" data-testid="catalog-skeleton">
      <div className={`${styles.block} ${styles.title}`} />
      <div className={`${styles.block} ${styles.lead}`} />
      <div className={`${styles.block} ${styles.filters}`} />
      <div className={styles.chips}>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={`${styles.block} ${styles.chip}`} />
        ))}
      </div>
      <div className={styles.grid}>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={`${styles.block} ${styles.card}`} />
        ))}
      </div>
    </div>
  );
}
