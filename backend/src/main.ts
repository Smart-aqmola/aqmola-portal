import { createApp } from "./app";

async function main() {
  const port = Number(process.env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  const app = await createApp();
  await app.listen(port, process.env.HOST ?? "127.0.0.1");
}
main().catch(() => {
  console.error("API startup failed. Check database and configuration.");
  process.exitCode = 1;
});
