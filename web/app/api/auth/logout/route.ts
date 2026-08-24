import { revokeCurrentSession } from "@/src/server/auth/session";

export async function POST() {
  await revokeCurrentSession();
  return Response.json({ ok: true });
}