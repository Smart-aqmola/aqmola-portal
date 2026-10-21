import styles from "./page-skeleton.module.css";

type PageSkeletonProps = {
  /** How many content blocks to draw under the title and the lead. */
  blocks?: number;
};

/** Grey placeholder for a simple page: a title, a line of text and a few blocks. */
export function PageSkeleton({ blocks = 3 }: PageSkeletonProps) {
  return (
    <div className={styles.skeleton} aria-hidden="true" data-testid="page-skeleton">
      <div className={`${styles.block} ${styles.title}`} />
      <div className={`${styles.block} ${styles.lead}`} />
      {Array.from({ length: blocks }, (_, index) => (
        <div key={index} className={`${styles.block} ${styles.content}`} />
      ))}
    </div>
  );
}
