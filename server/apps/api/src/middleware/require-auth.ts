import type { RequestHandler } from "express";
import { prisma } from "@pulsewatch/database";
import { getSessionToken, hashSessionToken } from "../lib/session.js";

export const requireAuth: RequestHandler = (req, res, next) => {
  void (async () => {
    const token = getSessionToken(req);

    if (!token) {
      res.status(401).json({
        error: { code: "UNAUTHENTICATED", message: "Authentication is required." }
      });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      select: {
        id: true,
        userId: true,
        expiresAt: true
      }
    });

    if (!session || session.expiresAt <= new Date()) {
      res.status(401).json({
        error: { code: "SESSION_INVALID", message: "Your session is invalid or expired." }
      });
      return;
    }

    req.auth = {
      userId: session.userId,
      sessionId: session.id
    };

    next();
  })().catch(next);
};
