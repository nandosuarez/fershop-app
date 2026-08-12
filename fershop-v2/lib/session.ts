import { createHmac, timingSafeEqual } from "node:crypto";

import type { SessionData } from "@/lib/auth-types";

export const SESSION_COOKIE_NAME = "fershop_session";
const sessionTtlSeconds = 60 * 60 * 12;

type SessionInput = Omit<SessionData, "expiresAt">;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET environment variable.");
  }
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("SESSION_SECRET must have at least 32 characters in production.");
  }
  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function createSessionToken(input: SessionInput) {
  const payload = Buffer.from(
    JSON.stringify({ ...input, expiresAt: Date.now() + sessionTtlSeconds * 1000 })
  ).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function verifySessionToken(token: string | null): SessionData | null {
  if (!token) {
    return null;
  }

  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) {
      return null;
    }
    const provided = Buffer.from(signature);
    const expected = Buffer.from(signPayload(payload));
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return null;
    }

    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionData;
    if (
      session.expiresAt <= Date.now() ||
      !session.userId ||
      !session.username ||
      !session.role
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  const secure =
    process.env.SESSION_SECURE === "true" ||
    (process.env.NODE_ENV === "production" && process.env.SESSION_SECURE !== "false");
  return {
    httpOnly: true,
    maxAge: sessionTtlSeconds,
    path: "/",
    sameSite: "lax" as const,
    secure,
  };
}
