import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/src/server/db";
import { mfaFactors } from "@/src/server/db/schema";
import { createTotpEnrollment, createTotpQrCode } from "@/src/server/auth/totp";
import { decryptSecret } from "@/src/server/auth/crypto";
import { getCurrentUser } from "@/src/server/auth/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

  const activeFactor = await db
    .select({ id: mfaFactors.id })
    .from(mfaFactors)
    .where(and(eq(mfaFactors.userId, user.id), isNotNull(mfaFactors.confirmedAt)))
    .limit(1);

  if (activeFactor[0]) {
    return Response.json({ error: "MFA is already configured" }, { status: 409 });
  }

  const pendingFactor = await db
    .select({ encryptedSecret: mfaFactors.encryptedSecret })
    .from(mfaFactors)
    .where(and(eq(mfaFactors.userId, user.id), isNull(mfaFactors.confirmedAt)))
    .orderBy(desc(mfaFactors.createdAt))
    .limit(1);

  if (pendingFactor[0]) {
    return Response.json({
      qrCodeDataUrl: await createTotpQrCode(user.username, decryptSecret(pendingFactor[0].encryptedSecret)),
    });
  }

  const enrollment = await createTotpEnrollment(user.username);
  await db.insert(mfaFactors).values({
    userId: user.id,
    encryptedSecret: enrollment.encryptedSecret,
    issuer: process.env.MFA_ISSUER ?? "MGI ERP",
  });

  return Response.json({ qrCodeDataUrl: enrollment.qrCodeDataUrl });
}