import { performance } from "node:perf_hooks";
import { prisma } from "@pulsewatch/database";
import { validatePublicHttpUrl } from "@pulsewatch/ssrf-guard";
import type { MonitorCheckJob } from "@pulsewatch/queue";

export async function processMonitorCheck(data: MonitorCheckJob) {
  const monitor = await prisma.monitor.findUnique({ where: { id: data.monitorId } });
  if (!monitor || !monitor.enabled) return;

  const startedAt = performance.now();
  let success = false;
  let statusCode: number | undefined;
  let errorMessage: string | undefined;

  try {
    const url = await validatePublicHttpUrl(monitor.url);
    // IMPORTANT: This fetch does not pin the validated DNS result to the socket.
    // Do not use for arbitrary untrusted targets until connection pinning,
    // redirect revalidation, and egress restrictions are implemented.
    const response = await fetch(url, {
      method: monitor.method,
      redirect: "manual",
      signal: AbortSignal.timeout(monitor.timeoutMs),
      headers: { "user-agent": "PulseWatch-Monitor/0.1" }
    });
    statusCode = response.status;
    success = response.status === monitor.expectedStatus;
    await response.body?.cancel();
    if (response.status >= 300 && response.status < 400) {
      errorMessage = "Redirect responses are not followed by this initial worker.";
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown monitoring error";
  }

  const responseTimeMs = Math.max(0, Math.round(performance.now() - startedAt));

  await prisma.$transaction(async (tx) => {
    await tx.checkResult.create({
      data: {
        monitorId: monitor.id,
        success,
        statusCode,
        responseTimeMs,
        errorMessage
      }
    });

    const updated = await tx.monitor.update({
      where: { id: monitor.id },
      data: {
        lastCheckedAt: new Date(),
        nextCheckAt: new Date(Date.now() + monitor.intervalSeconds * 1000),
        consecutiveFails: success ? 0 : { increment: 1 }
      }
    });

    const openIncident = await tx.incident.findFirst({
      where: { monitorId: monitor.id, status: { in: ["OPEN", "ACKNOWLEDGED"] } }
    });

    if (!success && updated.consecutiveFails >= 2 && !openIncident) {
      await tx.incident.create({
        data: {
          monitorId: monitor.id,
          title: `Monitor failing: ${monitor.name}`
        }
      });
    }

    if (success && openIncident && updated.consecutiveFails === 0) {
      await tx.incident.update({
        where: { id: openIncident.id },
        data: { status: "RESOLVED", resolvedAt: new Date() }
      });
    }
  });
}
