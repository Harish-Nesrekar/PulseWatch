import type { RequestHandler } from "express";
import { prisma } from "@pulsewatch/database";

export const requireOrganization: RequestHandler = (req, res, next) => {
  void (async () => {
    if (!req.auth) {
      res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required."
        }
      });
      return;
    }

    const organizationId = req.header("x-organization-id");

    if (!organizationId) {
      res.status(400).json({
        error: {
          code: "ORG_REQUIRED",
          message: "Organization context is required."
        }
      });
      return;
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.auth.userId,
          organizationId
        }
      },
      select: {
        role: true
      }
    });

    if (!membership) {
      res.status(403).json({
        error: {
          code: "ORGANIZATION_ACCESS_DENIED",
          message: "You do not have access to this organization."
        }
      });
      return;
    }

    req.auth.organizationId = organizationId;
    req.auth.organizationRole = membership.role;

    next();
  })().catch(next);
};