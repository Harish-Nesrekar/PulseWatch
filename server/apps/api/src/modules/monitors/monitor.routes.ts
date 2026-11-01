import { Router } from "express";
import { createMonitorSchema } from "@pulsewatch/contracts/monitor";
import { prisma } from "@pulsewatch/database";
import { monitorQueue } from "@pulsewatch/queue";
import { validatePublicHttpUrl } from "@pulsewatch/ssrf-guard";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireOrganization } from "../../middleware/require-organization.js";

export const monitorRouter: Router = Router();

monitorRouter.use(requireAuth, requireOrganization);

monitorRouter.get("/", async (req, res, next) => {
  try {
    const organizationId = req.auth!.organizationId!;

    const monitors = await prisma.monitor.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" }
    });

    res.json({ data: monitors });
  } catch (error) {
    next(error);
  }
});

monitorRouter.post("/", async (req, res, next) => {
  try {
    const organizationId = req.auth!.organizationId!;
    const role = req.auth!.organizationRole!;

    if (role === "VIEWER") {
      res.status(403).json({
        error: {
          code: "INSUFFICIENT_ROLE",
          message: "Viewers cannot create monitors."
        }
      });
      return;
    }

    const parsed = createMonitorSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.message
        }
      });
      return;
    }

    const safeUrl = await validatePublicHttpUrl(parsed.data.url);

    const monitor = await prisma.monitor.create({
      data: {
        organizationId,
        name: parsed.data.name,
        url: safeUrl.toString(),
        method: parsed.data.method,
        intervalSeconds: parsed.data.intervalSeconds,
        timeoutMs: parsed.data.timeoutMs,
        expectedStatus: parsed.data.expectedStatus
      }
    });

    await monitorQueue.add(
      "check-monitor",
      { monitorId: monitor.id },
      {
        jobId: `monitor-${monitor.id}-${Date.now()}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000
      }
    );

    res.status(201).json({ data: monitor });
  } catch (error) {
    next(error);
  }
});