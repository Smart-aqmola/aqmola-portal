export const DISPLAY_KEY = "aqmola:display";

export const themes = ["system", "light", "dark"] as const;
export type Theme = (typeof themes)[number];

export type DisplaySettings = { theme: Theme; contrast: boolean; large: boolean };

export const DEFAULT_SETTINGS: DisplaySettings = { theme: "system", contrast: false, large: false };

/** Read saved settings defensively: every unknown value falls back to its default on its own. */
export function parseSettings(raw: string | null): DisplaySettings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return DEFAULT_SETTINGS;
    }
    const { theme, contrast, large } = value as Record<string, unknown>;
    return {
      theme: themes.find((item) => item === theme) ?? DEFAULT_SETTINGS.theme,
      contrast: contrast === true,
      large: large === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export type DisplayAttributes = {
  "data-theme": "light" | "dark" | null;
  "data-contrast": "high" | null;
  "data-text": "large" | null;
};

/** What to put on <html>. With the "system" theme there is no attribute and the stylesheet follows the system. */
export function toAttributes(settings: DisplaySettings): DisplayAttributes {
  return {
    "data-theme": settings.theme === "system" ? null : settings.theme,
    "data-contrast": settings.contrast ? "high" : null,
    "data-text": settings.large ? "large" : null,
  };
}

/**
 * Runs in <head> before the first paint, so a saved dark theme or large text never flashes.
 * It repeats the rules of parseSettings and toAttributes in plain JavaScript; a test keeps them in step.
 */
export const noFlashScript = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(DISPLAY_KEY)})||"null");if(!s||typeof s!=="object")return;var r=document.documentElement;if(s.theme==="light"||s.theme==="dark")r.setAttribute("data-theme",s.theme);if(s.contrast===true)r.setAttribute("data-contrast","high");if(s.large===true)r.setAttribute("data-text","large");}catch(e){}})();`;
