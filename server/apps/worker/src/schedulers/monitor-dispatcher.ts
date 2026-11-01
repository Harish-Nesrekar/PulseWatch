
import { prisma } from "@pulsewatch/database";
import { monitorQueue } from "@pulsewatch/queue";

const DISPATCH_INTERVAL_MS = 5_000;
const BATCH_SIZE = 100;

let dispatching = false;

export async function dispatchDueMonitors(): Promise<void> {
  // Prevent overlapping runs within this worker process.
  if (dispatching) return;

  dispatching = true;

  try {
    const now = new Date();

    const dueMonitors = await prisma.monitor.findMany({
      where: {
        enabled: true,
        nextCheckAt: { lte: now }
      },
      select: {
        id: true
      },
      orderBy: {
        nextCheckAt: "asc"
      },
      take: BATCH_SIZE
    });

    for (const monitor of dueMonitors) {
      await monitorQueue.add(
        "check-monitor",
        { monitorId: monitor.id },
        {
          jobId: `scheduled-monitor-${monitor.id}`,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5_000
          },
          removeOnComplete: 1_000,
          removeOnFail: 5_000
        }
      );
    }

    if (dueMonitors.length > 0) {
      console.log(
        `Dispatched ${dueMonitors.length} due monitor(s).`
      );
    }
  } catch (error) {
    console.error("Monitor dispatcher failed:", error);
  } finally {
    dispatching = false;
  }
}

export function startMonitorDispatcher(): NodeJS.Timeout {
  console.log("Monitor dispatcher started.");

  void dispatchDueMonitors();

  return setInterval(() => {
    void dispatchDueMonitors();
  }, DISPATCH_INTERVAL_MS);
}
