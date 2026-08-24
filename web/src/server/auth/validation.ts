import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(256),
});

export const mfaCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "MFA code must contain 6 digits"),
});

export function isValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}