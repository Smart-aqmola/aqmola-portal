import { expect, test } from "@playwright/test";

// Headers that cost nothing and close common holes: clickjacking, content type guessing,
// leaking the full address to other sites, unused browser features, naming the framework, and plain HTTP.
test.describe("security headers", () => {
  for (const path of ["/ru", "/ru/services", "/en/news"]) {
    test(`are sent with ${path}`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.ok()).toBe(true);
      const headers = response.headers();

      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
      expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(headers["permissions-policy"]).toContain("camera=()");
      expect(headers["permissions-policy"]).toContain("geolocation=()");
      expect(headers["x-powered-by"]).toBeUndefined();
      // Production build: browsers must come back only over HTTPS for a year.
      expect(headers["strict-transport-security"]).toBe("max-age=31536000");

      const csp = headers["content-security-policy"];
      expect(csp).toContain("frame-ancestors 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("connect-src 'self'");
      expect(csp).not.toContain("unsafe-eval");
    });
  }

  test("the site still works with the policy: pages render and nothing is blocked", async ({
    page,
  }) => {
    const blocked: string[] = [];
    page.on("console", (message) => {
      if (/Content Security Policy|Refused to/i.test(message.text())) blocked.push(message.text());
    });
    for (const path of ["/ru", "/ru/news", "/ru/tourism", "/ru/services", "/ru/sign-in"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    expect(blocked).toEqual([]);
  });
});
