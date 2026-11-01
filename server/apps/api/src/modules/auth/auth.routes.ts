import { Router } from "express";
import { z } from "zod";
import argon2 from "argon2";
import { prisma } from "@pulsewatch/database";
import { requireAuth } from "../../middleware/require-auth.js";
import {
  clearSessionCookie,
  createSessionToken,
  getSessionToken,
  hashSessionToken,
  SESSION_DURATION_MS,
  setSessionCookie
} from "../../lib/session.js";
export const authRouter: Router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  organizationName: z.string().trim().min(2).max(100)
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128)
});

async function createSession(userId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt
    },
    select: { id: true, expiresAt: true }
  });

  return { token, session };
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map(issue => issue.message).join("; ")
        }
      });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const passwordHash = await argon2.hash(parsed.data.password, {
      type: argon2.argon2id
    });

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: parsed.data.name
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true
        }
      });

      const organization = await tx.organization.create({
        data: { name: parsed.data.organizationName },
        select: { id: true, name: true }
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "OWNER"
        }
      });

      const session = await tx.session.create({
        data: {
          userId: user.id,
          tokenHash: hashSessionToken(token),
          expiresAt
        },
        select: { id: true, expiresAt: true }
      });

      return { user, organization, session };
    });

    setSessionCookie(res, token);
    res.status(201).json({
      data: {
        user: result.user,
        organization: result.organization,
        role: "OWNER",
        sessionExpiresAt: result.session.expiresAt
      }
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        error: {
          code: "EMAIL_ALREADY_REGISTERED",
          message: "An account with this email already exists."
        }
      });
      return;
    }

    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Enter a valid email and password."
        }
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() }
    });

    if (!user || !(await argon2.verify(user.passwordHash, parsed.data.password))) {
      res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Email or password is incorrect."
        }
      });
      return;
    }

    const { token, session } = await createSession(user.id);
    setSessionCookie(res, token);

    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        sessionExpiresAt: session.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            organization: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!user) {
      res.status(401).json({
        error: { code: "USER_NOT_FOUND", message: "The account no longer exists." }
      });
      return;
    }

    res.json({ data: { user } });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = getSessionToken(req);

    if (token) {
      await prisma.session.deleteMany({
        where: {
          tokenHash: hashSessionToken(token)
        }
      });
    }

    clearSessionCookie(res);

    res.status(200).json({
      data: {
        message: "Logged out successfully."
      }
    });
  } catch (error) {
    next(error);
  }
});