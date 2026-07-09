import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(
    {
      sub: payload.userId,
      email: payload.email
    },
    env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    if (!isAccessTokenJwtPayload(payload)) {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email
    };
  } catch {
    return null;
  }
}

function isAccessTokenJwtPayload(payload: string | JwtPayload): payload is JwtPayload & { sub: string; email: string } {
  return typeof payload !== "string" && typeof payload.sub === "string" && typeof payload.email === "string";
}
