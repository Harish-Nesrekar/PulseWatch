
import { Worker } from "bullmq";
import { connection } from "@pulsewatch/queue";
import { prisma } from "@pulsewatch/database";
import { processMonitorCheck } from "./processors/check-monitor.js";
import { startMonitorDispatcher } from "./schedulers/monitor-dispatcher.js";

const concurrency = Number(
  process.env.MONITOR_WORKER_CONCURRENCY ?? 5
);

const worker = new Worker(
  "monitor-checks",
  async (job) => {
    if (job.name !== "check-monitor") return;

    await processMonitorCheck(
      job.data as { monitorId: string }
    );
  },
  {
    connection,
    concurrency: Number.isFinite(concurrency) && concurrency > 0
      ? concurrency
      : 5
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
});

worker.on("error", (error) => {
  console.error("Worker error:", error);
});

const dispatcherTimer = startMonitorDispatcher();

console.log("PulseWatch monitoring worker started.");

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received; shutting down worker...`);

  clearInterval(dispatcherTimer);

  await Promise.allSettled([
    worker.close(),
    prisma.$disconnect(),
    connection.quit()
  ]);

  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
