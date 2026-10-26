import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export function extractVercelIp(
  headers: Headers,
  environment: { VERCEL?: string } = { VERCEL: process.env.VERCEL },
) {
  if (environment.VERCEL !== "1") return null;
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first && isIP(first) > 0 ? first : null;
}

export function hashClientIp(ip: string, salt: string) {
  return createHmac("sha256", salt).update(ip).digest("hex");
}
