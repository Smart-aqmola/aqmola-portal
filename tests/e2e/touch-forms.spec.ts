import { expect, test } from "@playwright/test";

// iPhone Safari zooms the whole page when a field with text smaller than 16px gets focus.
// Every field must be at least 16px on touch devices, so the page never jumps.
test.describe("form fields on a touch screen", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "only meaningful on the phone project");
  });

  for (const path of ["/ru", "/ru/services", "/ru/news", "/ru/sign-in", "/ru/sign-up"]) {
    test(`keep their text at 16px or more on ${path}`, async ({ page }) => {
      await page.goto(path);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll("input, select, textarea")]
          .filter((field) => {
            const type = (field as HTMLInputElement).type;
            return type !== "checkbox" && type !== "radio" && type !== "hidden";
          })
          .map((field) => ({
            name: field.getAttribute("name") ?? field.id ?? field.tagName,
            size: parseFloat(getComputedStyle(field).fontSize),
          }))
          .filter((field) => field.size < 16),
      );
      expect(small, `fields under 16px on ${path}`).toEqual([]);
    });
  }
});
