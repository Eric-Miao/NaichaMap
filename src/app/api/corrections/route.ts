import { z } from "zod";

import { CORRECTION_ISSUE_TYPES } from "@/features/corrections/contracts";
import type { CorrectionResult } from "@/features/corrections/contracts";
import { extractVercelIp } from "@/features/corrections/ip";
import { submitCorrection } from "@/features/corrections/service";
import { getServerEnv } from "@/lib/env/server";

const correctionSchema = z.object({
  storeId: z.uuid().nullable().optional(),
  issueType: z.enum(CORRECTION_ISSUE_TYPES),
  details: z.string().min(1).max(500),
  submittedStoreName: z.string().max(200).nullable().optional(),
  submittedAddress: z.string().max(300).nullable().optional(),
});

type CorrectionRouteDependencies = {
  resolveIp: (headers: Headers) => string | null;
  submit: (input: z.infer<typeof correctionSchema> & { ip: string; salt: string }) => Promise<CorrectionResult>;
  salt: string;
};

function error(code: string, message: string, retryable: boolean, status: number, extra = {}) {
  return Response.json({ error: { code, message, retryable }, ...extra }, { status });
}

export async function handleCorrection(
  request: Request,
  dependencies: CorrectionRouteDependencies,
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("INVALID_REQUEST", "请求内容格式不正确", false, 400);
  }

  const parsed = correctionSchema.safeParse(body);
  if (!parsed.success) return error("INVALID_REQUEST", "纠错内容不符合要求", false, 400);

  const ip = dependencies.resolveIp(request.headers);
  if (!ip) return error("UNTRUSTED_CLIENT", "无法验证提交来源", false, 400);

  try {
    const result = await dependencies.submit({ ...parsed.data, ip, salt: dependencies.salt });
    if (!result.accepted) {
      return error("RATE_LIMITED", "每五分钟只能提交一次", true, 429, {
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return error("SUBMISSION_FAILED", "暂时无法提交纠错", true, 503);
  }
}

export async function POST(request: Request) {
  return handleCorrection(request, {
    resolveIp: extractVercelIp,
    submit: submitCorrection,
    salt: getServerEnv().IP_HASH_SALT,
  });
}
