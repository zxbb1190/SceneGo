import type { Request, RequestHandler } from "express";
import { verifyAccessToken } from "../auth/jwt.js";
import { ApiError } from "../http/apiError.js";

export interface RequestAuth {
  userId: string;
  email: string;
}

export type AuthenticatedRequest = Request & {
  auth: RequestAuth;
};

export const requireAuth: RequestHandler = (request, _response, next) => {
  const authorization = request.header("Authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;

  if (!token) {
    next(new ApiError(401, "AUTH_REQUIRED", "Authentication is required"));
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    next(new ApiError(401, "INVALID_TOKEN", "Access token is invalid or expired"));
    return;
  }

  (request as AuthenticatedRequest).auth = {
    userId: payload.userId,
    email: payload.email
  };
  next();
};

export function getAuth(request: Request): RequestAuth {
  const auth = (request as Partial<AuthenticatedRequest>).auth;
  if (!auth) {
    throw new ApiError(401, "AUTH_REQUIRED", "Authentication is required");
  }

  return auth;
}

