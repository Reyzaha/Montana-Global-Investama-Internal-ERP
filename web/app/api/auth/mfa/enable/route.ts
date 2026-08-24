import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/src/server/db";
import { mfaFactors } from "@/src/server/db/schema";
import { getCurrentUser } from "@/src/server/auth/session";
import { verifyTotp } from "@/src/server/auth/totp";
import { isValidOrigin, mfaCodeSchema } from "@/src/server/auth/validation";

export async function POST(request: Request) {
  if (!isValidOrigin(request)) return Response.json({ error: "Invalid request origin" }, { status: 403 });

  const user = await getCurrentUser();
  const parsed = mfaCodeSchema.safeParse(await request.json().catch(() => null));

  if (!user || !parsed.success) return Response.json({ error: "Invalid MFA code" }, { status: 400 });

  const factor = await db
    .select()
    .from(mfaFactors)
    .where(and(eq(mfaFactors.userId, user.id), isNull(mfaFactors.confirmedAt)))
    .orderBy(desc(mfaFactors.createdAt))
    .limit(1);

  if (!factor[0] || !(await verifyTotp(factor[0].encryptedSecret, parsed.data.code))) {
    return Response.json({ error: "Invalid MFA code" }, { status: 400 });
  }

  await db.update(mfaFactors).set({ confirmedAt: new Date() }).where(eq(mfaFactors.id, factor[0].id));
  return Response.json({ next: "dashboard" });
}