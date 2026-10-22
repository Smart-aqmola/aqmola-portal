// Measures page speed on a phone-like profile and prints a table. Usage:
//   pnpm build && pnpm start -p 3200   (in one terminal)
//   pnpm perf [http://localhost:3200]  (in another)
// Always measure the production build: the dev server is much slower and says little.
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3200";
const paths = [
  "/ru",
  "/ru/services",
  "/ru/services/water-meter-readings",
  "/ru/news",
  "/ru/tourism",
  "/ru/sign-in",
  "/ru/meters/submit",
  "/ru/billing/pay",
  "/ru/appeals/new",
  "/ru/operator/contracts",
  "/ru/admin/reports",
];

const browser = await chromium.launch();
const rows = [];

for (const path of paths) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  // Roughly "Fast 3G" and a 4x slower processor, close to a mid-range phone.
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  let bytes = 0;
  let jsBytes = 0;
  let requests = 0;
  const scripts = new Set();
  client.on("Network.loadingFinished", (event) => {
    bytes += event.encodedDataLength;
    if (scripts.has(event.requestId)) jsBytes += event.encodedDataLength;
  });
  client.on("Network.responseReceived", (event) => {
    requests += 1;
    if (event.type === "Script") scripts.add(event.requestId);
  });

  await page.addInitScript(() => {
    window.__metrics = { lcp: 0, lcpElement: "", cls: 0, tbt: 0 };
    new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      window.__metrics.lcp = last.startTime;
      window.__metrics.lcpElement = last.element ? last.element.tagName.toLowerCase() : "";
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__metrics.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__metrics.tbt += Math.max(0, entry.duration - 50);
      }
    }).observe({ type: "longtask", buffered: true });
  });

  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForLoadState("networkidle");
  const metrics = await page.evaluate(() => window.__metrics);
  rows.push({
    path,
    "KB loaded": Math.round(bytes / 1024),
    "JS KB": Math.round(jsBytes / 1024),
    requests,
    "LCP ms": Math.round(metrics.lcp),
    "LCP element": metrics.lcpElement,
    CLS: Number(metrics.cls.toFixed(3)),
    "TBT ms": Math.round(metrics.tbt),
  });
  await context.close();
}

await browser.close();
console.table(rows);
