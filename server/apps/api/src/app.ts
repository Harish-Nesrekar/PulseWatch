import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./modules/auth/auth.routes.js";
import { monitorRouter } from "./modules/monitors/monitor.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requireSameOrigin } from "./middleware/require-same-origin.js";

export const app: express.Express = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(cors({
  origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  credentials: true
}));

app.use(express.json({ limit: "32kb" }));

// Validate the Origin header on requests that change server state.
app.use(requireSameOrigin);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "pulsewatch-api" });
});

app.get("/ready", async (_req, res) => {
  // This currently checks API availability only.
  // PostgreSQL and Redis readiness checks are a separate task.
  res.json({ status: "ready" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/monitors", monitorRouter);

app.use(errorHandler);
