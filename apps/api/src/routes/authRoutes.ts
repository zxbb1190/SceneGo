import { Router } from "express";
import { z } from "zod";
import { signAccessToken } from "../auth/jwt.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../http/apiError.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { getAuth, requireAuth } from "../middleware/auth.js";

const authInputSchema = z.object({
  email: z.string().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128)
});

const registerInputSchema = authInputSchema.extend({
  nickname: z.string().trim().min(1).max(100).optional()
});

export function createAuthRouter(): Router {
  const router = Router();

  router.post(
    "/register",
    asyncHandler(async (request, response) => {
      const input = registerInputSchema.parse(request.body);
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true }
      });

      if (existingUser) {
        throw new ApiError(409, "EMAIL_ALREADY_REGISTERED", "Email is already registered");
      }

      const user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash: await hashPassword(input.password),
          nickname: input.nickname
        },
        select: userSelect
      });

      response.status(201).json({
        user: toUserDto(user),
        accessToken: signAccessToken({ userId: user.id, email: user.email })
      });
    })
  );

  router.post(
    "/login",
    asyncHandler(async (request, response) => {
      const input = authInputSchema.parse(request.body);
      const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: {
          ...userSelect,
          passwordHash: true
        }
      });

      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
      }

      response.json({
        user: toUserDto(user),
        accessToken: signAccessToken({ userId: user.id, email: user.email })
      });
    })
  );

  router.get(
    "/me",
    requireAuth,
    asyncHandler(async (request, response) => {
      const auth = getAuth(request);
      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: userSelect
      });

      if (!user) {
        throw new ApiError(404, "USER_NOT_FOUND", "User was not found");
      }

      response.json({ user: toUserDto(user) });
    })
  );

  return router;
}

const userSelect = {
  id: true,
  email: true,
  nickname: true,
  createdAt: true,
  updatedAt: true
} as const;

type UserRecord = {
  id: string;
  email: string;
  nickname: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toUserDto(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname ?? undefined,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

