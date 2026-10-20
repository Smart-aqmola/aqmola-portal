import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";

export type ButtonVariant = "primary" | "dark" | "light" | "ghost";

type CommonProps = {
  variant?: ButtonVariant;
  size?: "md" | "lg";
  className?: string;
  children: ReactNode;
};

type ActionProps = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps>;
type LinkProps = CommonProps & { href: string };

/** One component for both actions (button) and navigation (link styled as a button). */
export function Button(props: ActionProps | LinkProps) {
  if ("href" in props) {
    const { variant = "primary", size = "md", className, children, href } = props;
    return (
      <Link
        href={href}
        className={[styles.button, className].filter(Boolean).join(" ")}
        data-variant={variant}
        data-size={size}
      >
        {children}
      </Link>
    );
  }

  const { variant = "primary", size = "md", className, children, type = "button", ...rest } = props;
  return (
    <button
      type={type}
      className={[styles.button, className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {children}
    </button>
  );
}
