import { z } from "zod";

export const createMonitorSchema = z.object({
  name: z.string().trim().min(1).max(100),
  url: z.string().url().max(2048),
  method: z.enum(["GET", "HEAD"]).default("GET"),
  intervalSeconds: z.number().int().min(60).max(86400).default(300),
  timeoutMs: z.number().int().min(1000).max(15000).default(10000),
  expectedStatus: z.number().int().min(100).max(599).default(200)
});

export const monitorResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  method: z.enum(["GET", "HEAD"]),
  intervalSeconds: z.number(),
  timeoutMs: z.number(),
  expectedStatus: z.number(),
  enabled: z.boolean(),
  createdAt: z.string()
});

export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;
