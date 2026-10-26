import { z } from "zod";

import { NearbyServiceError } from "@/features/nearby/contracts";
import type { NearbyErrorBody, NearbyErrorCode } from "@/features/nearby/contracts";
import { getNearby } from "@/features/nearby/service";
import { assertShanghaiLocation, InvalidLocationError } from "@/lib/geo/coordinates";

const inputSchema = z.object({
  lng: z.number().finite().min(-180).max(180),
  lat: z.number().finite().min(-90).max(90),
});

function errorResponse(code: NearbyErrorCode, message: string, retryable: boolean, status: number) {
  const body: NearbyErrorBody = { error: { code, message, retryable } };
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST", "请求内容格式不正确", false, 400);
  }

  const result = inputSchema.safeParse(parsed);
  if (!result.success) {
    return errorResponse("INVALID_REQUEST", "需要有效的经纬度", false, 400);
  }

  try {
    assertShanghaiLocation(result.data);
  } catch (error) {
    if (error instanceof InvalidLocationError) {
      return errorResponse("OUTSIDE_SHANGHAI", "第一版暂时只支持上海", false, 400);
    }
    throw error;
  }

  try {
    return Response.json(await getNearby(result.data));
  } catch (error) {
    if (error instanceof NearbyServiceError) {
      return errorResponse(error.code, error.message, error.retryable, 503);
    }
    return errorResponse("INTERNAL_ERROR", "暂时无法获取附近门店", true, 500);
  }
}
