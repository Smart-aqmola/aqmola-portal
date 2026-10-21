import type { ReactNode } from "react";

const icons = {
  meter: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13l4-3M8 5l1 2M16 5l-1 2" />
    </>
  ),
  house: <path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6" />,
  plug: <path d="M9 3v5M15 3v5M6 8h12v4a6 6 0 0 1-12 0zM12 18v3" />,
  doc: <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5" />,
  heat: <path d="M5 20V9M10 20V6M15 20V9M20 20V6M3 20h19M5 9c1-2 3-2 5-3M15 9c1-2 3-2 5-3" />,
  crane: <path d="M4 21h16M7 21V4h2v17M9 5h11l-3 3M17 8v4M15 12h4v3h-4z" />,
  chart: <path d="M3 21h18M6 17v-5M11 17V7M16 17v-8M20 5l-4 4-5-2-5 4" />,
  chat: <path d="M4 5h16v11H9l-5 4zM8 9h8M8 12h5" />,
  water: <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />,
  bolt: <path d="M13 3L5 14h6l-1 7 8-11h-6z" />,
  flame: <path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 3-6 1 2 2 2 3 2-1-3 0-5 0-7z" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6 7-11.5a7 7 0 0 0-14 0C5 15 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
    </>
  ),
  contrast: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </>
  ),
  next: <path d="M9 5l7 7-7 7" />,
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  online: (
    <>
      <rect x="4" y="5" width="16" height="11" rx="2" />
      <path d="M9 20h6M12 16v4" />
    </>
  ),
  files: <path d="M8 7h9l3 3v11H8zM5 4h9M5 4v13" />,
  car: <path d="M5 16V11l2-5h10l2 5v5M3 16h18M7 19v-3M17 19v-3M7 11h10" />,
  tree: <path d="M12 3l5 7h-3l4 6H6l4-6H7zM12 16v5" />,
  bed: <path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11h.01" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  bell: <path d="M6 17v-6a6 6 0 0 1 12 0v6l2 2H4zM10 21h4" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof icons;
export const iconNames = Object.keys(icons) as IconName[];

type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

/** Decorative icon. Put the meaning in nearby text or an aria-label on the parent control. */
export function Icon({ name, size = 22, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon={name}
    >
      {icons[name]}
    </svg>
  );
}
