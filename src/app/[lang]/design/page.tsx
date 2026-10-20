import type { Metadata } from "next";
import { Button } from "@/shared/ui/button/button";
import { Card } from "@/shared/ui/card/card";
import { Icon, iconNames } from "@/shared/ui/icon/icon";
import styles from "./design.module.css";

// Temporary developer page: a living style guide for the design system. Not linked from the site.
export const metadata: Metadata = { title: "Дизайн-система (dev)", robots: { index: false } };

const colors = [
  ["accent", "--color-accent"],
  ["accent-strong", "--color-accent-strong"],
  ["accent-soft", "--color-accent-soft"],
  ["ink", "--color-ink"],
  ["text", "--color-text"],
  ["muted", "--color-muted"],
  ["line", "--color-line"],
  ["surface-soft", "--color-surface-soft"],
] as const;

const statuses = [
  ["Подана", "new"],
  ["В работе", "work"],
  ["Исполнена", "done"],
] as const;

export default function DesignPage() {
  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Дизайн-система</h1>
      <p className={styles.note}>
        Временная страница для разработки: показывает токены и компоненты. Тексты здесь не
        переводятся.
      </p>

      <section className={styles.section}>
        <h2>Цвета</h2>
        <ul className={styles.swatches}>
          {colors.map(([name, variable]) => (
            <li key={name}>
              <span className={styles.swatch} style={{ background: `var(${variable})` }} />
              <code>{name}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Шрифт Onest, кириллица и казахские буквы</h2>
        <p className={styles.display}>Услуги рядом</p>
        <p>Ә ә Ғ ғ Қ қ Ң ң Ө ө Ұ ұ Ү ү Һ һ І і — все казахские буквы</p>
        <p className={styles.small}>Лёгкий 300, обычный 400, средний 500, полужирный 600.</p>
      </section>

      <section className={styles.section}>
        <h2>Кнопки</h2>
        <div className={styles.row}>
          <Button>Заказать услугу</Button>
          <Button variant="dark">Найти</Button>
          <Button variant="light">Войти</Button>
          <Button variant="ghost">Подробнее</Button>
          <Button size="lg">Подать заявку</Button>
          <Button disabled>Недоступно</Button>
          <Button href="#">Ссылка-кнопка</Button>
        </div>
        <div className={`${styles.row} ${styles.dark}`}>
          <Button variant="light">На фото</Button>
          <Button variant="ghost">Контурная</Button>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Карточки</h2>
        <div className={styles.cards}>
          <Card as="article">
            <h3>Передача показаний воды</h3>
            <p className={styles.small}>Водоканал Кокшетау (тест)</p>
          </Card>
          <Card as="article" padding="lg">
            <h3>Крупный отступ</h3>
            <p className={styles.small}>Для панелей и форм.</p>
          </Card>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Статусы заявки</h2>
        <div className={styles.row}>
          {statuses.map(([label, kind]) => (
            <span key={kind} className={styles.status} data-kind={kind}>
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Иконки</h2>
        <ul className={styles.icons}>
          {iconNames.map((name) => (
            <li key={name}>
              <Icon name={name} size={28} />
              <code>{name}</code>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
