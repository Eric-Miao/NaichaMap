import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  AMAP_WEB_SERVICE_KEY: z.string().min(1),
  IP_HASH_SALT: z.string().min(16),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    AMAP_WEB_SERVICE_KEY: process.env.AMAP_WEB_SERVICE_KEY,
    IP_HASH_SALT: process.env.IP_HASH_SALT,
  });
}
