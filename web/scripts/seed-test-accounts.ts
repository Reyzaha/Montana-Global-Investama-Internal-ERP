import { config } from "dotenv";

config({ path: ".env.local", override: true });

import { eq } from "drizzle-orm";
import { db, client } from "../src/server/db";
import { users } from "../src/server/db/schema";
import { normalizeUsername, hashPassword } from "../src/server/auth/password";

export const TEST_ACCOUNTS = [
  {
    username: "hrtest1@tes.com",
    role: "HR",
    name: "HR Lead (Test)",
    department: "Human Resources",
  },
  {
    username: "ittes1@tes.com",
    role: "IT",
    name: "IT Specialist (Test)",
    department: "IT",
  },
  {
    username: "legaltes1@tes.com",
    role: "LEGAL",
    name: "Legal Counsel (Test)",
    department: "Legal",
  },
  {
    username: "financetes1@tes.com",
    role: "FINANCE",
    name: "Finance Lead (Test)",
    department: "Finance & Accounting",
  },
  {
    username: "busnistes1@tes.com",
    role: "BUSINESS_DEVELOPMENT",
    name: "Business Development Lead (Test)",
    department: "Business Development",
  },
  {
    username: "ceotes1@tes.com",
    role: "CEO",
    name: "Chief Executive Officer (Test)",
    department: "Executive",
  },
];

const DEFAULT_PASSWORD = process.env.TEST_ACCOUNT_PASSWORD || "Montana2026!#";

async function main() {
  console.log("Seeding test accounts (0 dummy business data)...");
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  for (const account of TEST_ACCOUNTS) {
    const normalizedUsername = normalizeUsername(account.username);
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.normalizedUsername, normalizedUsername))
      .limit(1);

    if (existing[0]) {
      await db
        .update(users)
        .set({
          username: account.username,
          passwordHash,
          name: account.name,
          department: account.department,
          role: account.role,
          isActive: true,
          mfaRequired: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing[0].id));
      console.log(`Updated test account: ${account.username} [${account.role}]`);
    } else {
      await db.insert(users).values({
        username: account.username,
        normalizedUsername,
        passwordHash,
        name: account.name,
        department: account.department,
        role: account.role,
        isActive: true,
        mfaRequired: false,
      });
      console.log(`Created test account: ${account.username} [${account.role}]`);
    }
  }

  console.log(`Successfully seeded ${TEST_ACCOUNTS.length} test accounts.`);
  await client.end();
}

main().catch(async (error) => {
  console.error("Failed to seed test accounts:", error);
  await client.end();
  process.exit(1);
});
