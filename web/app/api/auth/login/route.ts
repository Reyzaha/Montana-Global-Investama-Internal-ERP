import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "@/src/server/db";
import { mfaFactors, users } from "@/src/server/db/schema";
import { createMfaChallenge, createSession } from "@/src/server/auth/session";
import { normalizeUsername, verifyPassword } from "@/src/server/auth/password";
import { isValidOrigin, loginSchema } from "@/src/server/auth/validation";

export async function POST(request: Request) {
  if (!isValidOrigin(request)) {
    return Response.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "Invalid username or password" }, { status: 400 });
  }

  const normalizedUsername = normalizeUsername(parsed.data.username);
  const result = await db
    .select({ user: users, factorId: mfaFactors.id })
    .from(users)
    .leftJoin(
      mfaFactors,
      and(eq(mfaFactors.userId, users.id), isNotNull(mfaFactors.confirmedAt)),
    )
    .where(eq(users.normalizedUsername, normalizedUsername))
    .limit(1);
  const record = result[0];

  if (!record || !record.user.isActive || !(await verifyPassword(record.user.passwordHash, parsed.data.password))) {
    return Response.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const mfaDisabledForDevelopment =
    process.env.NODE_ENV === "development" && process.env.DISABLE_MFA_FOR_DEVELOPMENT === "true";

  const targetNext = record.user.role === "HR" ? "hr" : "dashboard";

  if (mfaDisabledForDevelopment || !record.user.mfaRequired) {
    await createSession(record.user.id);
    return Response.json({ next: targetNext, role: record.user.role });
  }

  if (record.factorId) {
    await createMfaChallenge(record.user.id);
    return Response.json({ next: "mfa", role: record.user.role });
  }

  await createSession(record.user.id);
  return Response.json({ next: "mfa-setup", role: record.user.role });
}