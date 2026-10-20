// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

function request(path: string, acceptLanguage?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: acceptLanguage ? { "accept-language": acceptLanguage } : {},
  });
}

describe("proxy", () => {
  it("redirects the root to the preferred language", () => {
    const response = proxy(request("/", "kk-KZ,kk;q=0.9,ru;q=0.5"));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/kk");
  });

  it("uses Russian when the browser language is not supported", () => {
    const response = proxy(request("/", "fr-FR"));
    expect(new URL(response.headers.get("location")!).pathname).toBe("/ru");
  });

  it("keeps the rest of the path when adding a language", () => {
    const response = proxy(request("/services/water", "en-US"));
    expect(new URL(response.headers.get("location")!).pathname).toBe("/en/services/water");
  });

  it("keeps the query string", () => {
    const response = proxy(request("/services?q=%D0%B2%D0%BE%D0%B4%D0%B0", "ru"));
    expect(new URL(response.headers.get("location")!).search).toBe("?q=%D0%B2%D0%BE%D0%B4%D0%B0");
  });

  it("lets paths that already have a language through", () => {
    const response = proxy(request("/kk/services", "en"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });
});
