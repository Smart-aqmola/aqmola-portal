import { Injectable } from "@nestjs/common";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/** A developer-only delivery adapter. Files never have an HTTP route. */
@Injectable()
export class LocalSms {
  constructor() {
    if (process.env.SMS_TRANSPORT !== "local" || process.env.NODE_ENV !== "development") {
      throw new Error("Only development local SMS transport is configured");
    }
    if (process.env.HOST && !["127.0.0.1", "localhost", "::1"].includes(process.env.HOST)) {
      throw new Error("Local SMS transport requires a loopback listener");
    }
  }
  async send(challengeId: string, phone: string, code: string, expiresAt: Date) {
    const directory = resolve(".local-sms");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(
      resolve(directory, `${challengeId}.json`),
      JSON.stringify({ phone, code, expiresAt: expiresAt.toISOString() }),
      { mode: 0o600, flag: "wx" },
    );
  }
}
