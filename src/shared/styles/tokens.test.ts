import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "tokens.css"), "utf8");

/** Declarations of the block that starts with exactly this selector, e.g. `:root[data-theme="dark"]`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`No block for ${selector}`);
  const end = css.indexOf("\n}", start);
  const body = css.slice(start, end);
  return Object.fromEntries(
    [...body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
  );
}

const base = block(":root");
const dark = { ...base, ...block(':root[data-theme="dark"]') };
const high = { ...base, ...block(':root[data-contrast="high"]') };
const darkHigh = { ...dark, ...block(':root[data-theme="dark"][data-contrast="high"]') };

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

function contrast(a: string, b: string): number {
  const [light, darker] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
  return (light + 0.05) / (darker + 0.05);
}

type Tokens = Record<string, string>;

/** Pairs that really appear in the interface: text on its background. */
const textPairs: [string, string][] = [
  ["--color-text", "--color-surface"],
  ["--color-text", "--color-surface-soft"],
  ["--color-muted", "--color-surface"],
  ["--color-muted", "--color-surface-soft"],
  ["--color-accent-text", "--color-surface"],
  ["--color-accent-text", "--color-surface-soft"],
  ["--color-accent-text", "--color-accent-soft"],
  ["--color-on-dark", "--color-accent"],
  ["--color-on-dark", "--color-accent-strong"],
  ["--color-on-dark", "--color-ink"],
  ["--color-danger", "--color-surface"],
  ["--color-danger", "--color-surface-soft"],
  ["--status-new-fg", "--status-new-bg"],
  ["--status-work-fg", "--status-work-bg"],
  ["--status-done-fg", "--status-done-bg"],
];

function check(name: string, tokens: Tokens, minimum: number) {
  describe(name, () => {
    for (const [fg, bg] of textPairs) {
      it(`${fg} on ${bg} is at least ${minimum}:1`, () => {
        expect(tokens[fg], fg).toMatch(/^#[0-9a-f]{6}$/i);
        expect(tokens[bg], bg).toMatch(/^#[0-9a-f]{6}$/i);
        expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(minimum);
      });
    }

    it("keeps the focus ring visible on both surfaces (3:1)", () => {
      expect(contrast(tokens["--color-focus"], tokens["--color-surface"])).toBeGreaterThanOrEqual(
        3,
      );
      expect(
        contrast(tokens["--color-focus"], tokens["--color-surface-soft"]),
      ).toBeGreaterThanOrEqual(3);
    });
  });
}

check("light theme", base, 4.5);
check("dark theme", dark, 4.5);
check("light high contrast", high, 7);
check("dark high contrast", darkHigh, 7);

describe("theme switches", () => {
  it("has the same dark values for the system preference as for the chosen dark theme", () => {
    const media = css.slice(css.indexOf("@media (prefers-color-scheme: dark)"));
    for (const [name, value] of Object.entries(block(':root[data-theme="dark"]'))) {
      expect(media, name).toContain(`${name}: ${value};`);
    }
  });

  it("scales the text up in the large-text mode", () => {
    expect(css).toContain(':root[data-text="large"]');
  });
});

describe("cards stand out from the page in the dark themes", () => {
  const themes: [string, Tokens][] = [
    ["dark", dark],
    ["dark high contrast", darkHigh],
  ];
  for (const [name, tokens] of themes) {
    it(`${name}: the page is darker than a card and a card has a visible border`, () => {
      expect(tokens["--color-page"], "page").toMatch(/^#[0-9a-f]{6}$/i);
      expect(luminance(tokens["--color-page"])).toBeLessThan(luminance(tokens["--color-surface"]));
      expect(tokens["--color-card-border"]).toBe("var(--color-line)");
      // The border is the line colour: it must be seen against the page.
      expect(contrast(tokens["--color-line"], tokens["--color-page"])).toBeGreaterThanOrEqual(1.5);
    });

    it(`${name}: text is readable on the page`, () => {
      expect(contrast(tokens["--color-text"], tokens["--color-page"])).toBeGreaterThanOrEqual(7);
    });
  }

  it("light themes keep the white page and need no card border", () => {
    expect(base["--color-page"]).toBe("var(--color-surface)");
    expect(base["--color-card-border"]).toBe("transparent");
  });
});
