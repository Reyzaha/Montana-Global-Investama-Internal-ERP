import { redirect } from "next/navigation";
import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "../db";
import { mfaFactors } from "../db/schema";
import { getCurrentUser } from "./session";

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const mfaDisabledForDevelopment =
    process.env.NODE_ENV === "development" && process.env.DISABLE_MFA_FOR_DEVELOPMENT === "true";

  if (mfaDisabledForDevelopment) {
    return user;
  }

  const activeFactor = await db
    .select({ id: mfaFactors.id })
    .from(mfaFactors)
    .where(and(eq(mfaFactors.userId, user.id), isNotNull(mfaFactors.confirmedAt)))
    .limit(1);

  if (!activeFactor[0]) {
    redirect("/mfa/setup");
  }

  return user;
}