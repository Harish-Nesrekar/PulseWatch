import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  const message = status >= 500 ? "An unexpected server error occurred." : String(error.message);
  if (status >= 500) console.error(error);
  res.status(status).json({ error: { code: error?.code ?? "INTERNAL_ERROR", message } });
};
