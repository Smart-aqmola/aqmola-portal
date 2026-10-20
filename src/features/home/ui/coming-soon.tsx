import styles from "./coming-soon.module.css";

type ComingSoonProps = {
  title: string;
  badge: string;
  items: { id: string; title: string; summary: string }[];
};

/** Short, quiet list of sections that are announced but not built yet. */
export function ComingSoon({ title, badge, items }: ComingSoonProps) {
  return (
    <section>
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            <span>
              <span className={styles.name}>{item.title}</span>
              <span className={styles.summary}>{item.summary}</span>
            </span>
            <span className={styles.badge}>{badge}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
