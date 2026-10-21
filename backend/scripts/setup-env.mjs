import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";

let env;
try {
  env = await readFile(".env", "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  env = await readFile(".env.example", "utf8");
}
if (!/^AUTH_OTP_SECRET=.+$/m.test(env)) {
  const line = `AUTH_OTP_SECRET=${randomBytes(32).toString("hex")}`;
  env = /^AUTH_OTP_SECRET=.*$/m.test(env)
    ? env.replace(/^AUTH_OTP_SECRET=.*$/m, line)
    : `${env}\n${line}\n`;
}
await writeFile(".env", env, { mode: 0o600 });
console.log("Local environment is ready; OTP secret is stored in .env.");
