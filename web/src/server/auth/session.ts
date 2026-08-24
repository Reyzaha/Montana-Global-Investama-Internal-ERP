import { and, eq, isNull, gt } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "../db";
import { mfaChallenges, sessions, users } from "../db/schema";
import { createOpaqueToken, hashToken } from "./crypto";

const cookieName = process.env.AUTH_COOKIE_NAME ?? "mgi_session";
const challengeCookieName = "mgi_mfa_challenge";
const sessionDays = Number(process.env.AUTH_SESSION_DAYS ?? "7");
const sessionLifetime = Number.isFinite(sessionDays) && sessionDays > 0 ? sessionDays : 7;

function sessionExpiry() {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + sessionLifetime);
  return expiry;
}

export async function createSession(userId: string) {
  const token = createOpaqueToken();
  const expiresAt = sessionExpiry();

  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (token) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, hashToken(token)));
  }

  cookieStore.delete(cookieName);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (!token) {
    return null;
  }

  const result = await db
    .select({
      user: users,
      sessionId: sessions.id,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
        eq(users.isActive, true),
      ),
    )
    .limit(1);

  if (!result[0]) {
    cookieStore.delete(cookieName);
    return null;
  }

  await db
    .update(sessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(sessions.id, result[0].sessionId));

  return result[0].user;
}

export async function createMfaChallenge(userId: string) {
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db.insert(mfaChallenges).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(challengeCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getMfaChallengeUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(challengeCookieName)?.value;

  if (!token) return null;

  const result = await db
    .select({ challenge: mfaChallenges, user: users })
    .from(mfaChallenges)
    .innerJoin(users, eq(users.id, mfaChallenges.userId))
    .where(
      and(
        eq(mfaChallenges.tokenHash, hashToken(token)),
        isNull(mfaChallenges.consumedAt),
        gt(mfaChallenges.expiresAt, new Date()),
        eq(users.isActive, true),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function consumeMfaChallenge() {
  const cookieStore = await cookies();
  const token = cookieStore.get(challengeCookieName)?.value;

  if (token) {
    await db
      .update(mfaChallenges)
      .set({ consumedAt: new Date() })
      .where(eq(mfaChallenges.tokenHash, hashToken(token)));
  }

  cookieStore.delete(challengeCookieName);
}