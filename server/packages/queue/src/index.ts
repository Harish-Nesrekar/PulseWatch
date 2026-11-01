import { Queue } from "bullmq";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true
});

export const monitorQueue = new Queue("monitor-checks", { connection });

export type MonitorCheckJob = {
  monitorId: string;
};