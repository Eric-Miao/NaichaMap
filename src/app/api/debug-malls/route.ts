import { AmapClient } from "@/lib/amap/client";
import { assertShanghaiLocation, wgs84ToGcj02 } from "@/lib/geo/coordinates";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const point = {
    lng: Number(url.searchParams.get("lng")),
    lat: Number(url.searchParams.get("lat")),
  };
  assertShanghaiLocation(point);

  const fetched = await new AmapClient().searchMalls(wgs84ToGcj02(point), 1_500);
  const client = createAdminClient();
  const { data, error } = await client
    .from("malls")
    .select("provider_place_id,name,address,location_wgs84,last_seen_at")
    .order("last_seen_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  return Response.json({
    fetched: fetched.map((mall) => ({
      providerPlaceId: mall.providerPlaceId,
      name: mall.name,
      address: mall.address,
      location: mall.wgs84,
    })),
    persisted: data.map((mall) => ({
      providerPlaceId: mall.provider_place_id,
      name: mall.name,
      address: mall.address,
      location: mall.location_wgs84,
      lastSeenAt: mall.last_seen_at,
    })),
  });
}
