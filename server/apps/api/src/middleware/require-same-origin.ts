import type { RequestHandler } from "express";

const allowedOrigin = (
  process.env.WEB_ORIGIN ?? "http://localhost:3000"
).replace(/\/$/, "");

export const requireSameOrigin: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");

  if (!origin || origin.replace(/\/$/, "") !== allowedOrigin) {
    res.status(403).json({
      error: {
        code: "INVALID_ORIGIN",
        message: "This request origin is not allowed."
      }
    });
    return;
  }

  next();
};
