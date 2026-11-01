import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "@pulsewatch/database";
import { connection } from "@pulsewatch/queue";

const server = app.listen(env.API_PORT, () => {
  console.log(`PulseWatch API listening on http://localhost:${env.API_PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down API...`);
  server.close(async () => {
    await Promise.allSettled([prisma.$disconnect(), connection.quit()]);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
