import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "@/src/server/db";
import { mfaFactors } from "@/src/server/db/schema";
import { consumeMfaChallenge, createSession, getMfaChallengeUser } from "@/src/server/auth/session";
import { verifyTotp } from "@/src/server/auth/totp";
import { isValidOrigin, mfaCodeSchema } from "@/src/server/auth/validation";

export async function POST(request: Request) {
  if (!isValidOrigin(request)) return Response.json({ error: "Invalid request origin" }, { status: 403 });

  const challenge = await getMfaChallengeUser();
  const parsed = mfaCodeSchema.safeParse(await request.json().catch(() => null));

  if (!challenge || !parsed.success) return Response.json({ error: "Invalid MFA code" }, { status: 400 });

  const factor = await db
    .select()
    .from(mfaFactors)
    .where(and(eq(mfaFactors.userId, challenge.user.id), isNotNull(mfaFactors.confirmedAt)))
    .limit(1);

  if (!factor[0] || !(await verifyTotp(factor[0].encryptedSecret, parsed.data.code))) {
    return Response.json({ error: "Invalid MFA code" }, { status: 400 });
  }

  await consumeMfaChallenge();
  await createSession(challenge.user.id);
  return Response.json({ next: "dashboard" });
}