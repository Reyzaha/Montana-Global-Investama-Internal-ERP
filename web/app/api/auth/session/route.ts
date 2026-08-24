import { getCurrentUser } from "@/src/server/auth/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) return Response.json({ user: null }, { status: 401 });

  return Response.json({
    user: { id: user.id, username: user.username },
  });
}