import { config } from "dotenv";

config({ path: ".env.local", override: true });

import { eq } from "drizzle-orm";

import { db, client } from "../src/server/db";
import { users } from "../src/server/db/schema";
import { normalizeUsername, hashPassword } from "../src/server/auth/password";

const username = process.env.ADMIN_USERNAME?.trim();
const password = process.env.ADMIN_PASSWORD;

async function main() {
  if (!username || !password || password.length < 12) {
    throw new Error("ADMIN_USERNAME and an ADMIN_PASSWORD of at least 12 characters are required");
  }

  const normalizedUsername = normalizeUsername(username);
  const passwordHash = await hashPassword(password);
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.normalizedUsername, normalizedUsername))
    .limit(1);

  if (existing[0]) {
    await db
      .update(users)
      .set({ username, passwordHash, isActive: true, mfaRequired: true, updatedAt: new Date() })
      .where(eq(users.id, existing[0].id));
  } else {
    await db.insert(users).values({
      username,
      normalizedUsername,
      passwordHash,
      mfaRequired: true,
    });
  }

  console.log(`Admin user '${username}' is ready.`);
  await client.end();
}

main().catch(async (error) => {
  await client.end();
  throw error;
});