import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  DISPLAY_KEY,
  noFlashScript,
  parseSettings,
  toAttributes,
} from "./settings";

describe("parseSettings", () => {
  it("returns the defaults for nothing or for broken text", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("{oops")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("[1]")).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps known values and drops unknown ones one by one", () => {
    expect(parseSettings('{"theme":"dark","contrast":true,"large":true}')).toEqual({
      theme: "dark",
      contrast: true,
      large: true,
    });
    expect(parseSettings('{"theme":"neon","contrast":"yes","large":true}')).toEqual({
      theme: "system",
      contrast: false,
      large: true,
    });
  });
});

describe("toAttributes", () => {
  it("leaves the theme to the system when nothing is chosen", () => {
    expect(toAttributes(DEFAULT_SETTINGS)).toEqual({
      "data-theme": null,
      "data-contrast": null,
      "data-text": null,
    });
  });

  it("sets an attribute for every chosen option", () => {
    expect(toAttributes({ theme: "light", contrast: true, large: true })).toEqual({
      "data-theme": "light",
      "data-contrast": "high",
      "data-text": "large",
    });
  });
});

describe("noFlashScript", () => {
  function run(stored: string | null) {
    window.localStorage.clear();
    if (stored) window.localStorage.setItem(DISPLAY_KEY, stored);
    const root = document.documentElement;
    for (const name of ["data-theme", "data-contrast", "data-text"]) root.removeAttribute(name);
    new Function(noFlashScript)();
    return root;
  }

  it("applies the saved settings before the page is painted", () => {
    const root = run('{"theme":"dark","contrast":true,"large":true}');
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(root.getAttribute("data-contrast")).toBe("high");
    expect(root.getAttribute("data-text")).toBe("large");
  });

  it("does nothing without saved settings and never throws on bad ones", () => {
    expect(run(null).hasAttribute("data-theme")).toBe(false);
    expect(run("{oops").hasAttribute("data-theme")).toBe(false);
  });
});
