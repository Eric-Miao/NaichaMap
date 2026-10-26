import type { GeoPoint } from "@/lib/geo/coordinates";

export type StoreCategory = "tea_drink" | "beverage" | "coffee";

export type BrandAlias = {
  id: string;
  canonicalName: string;
  aliases: string[];
};

export type NormalizedPoi = {
  provider: "amap";
  providerPlaceId: string;
  name: string;
  canonicalName: string;
  branchName: string | null;
  brandId: string | null;
  category: StoreCategory;
  address: string;
  gcj02: GeoPoint;
  wgs84: GeoPoint;
  providerParentId: string | null;
};

export type NormalizedPlace = {
  provider: "amap";
  providerPlaceId: string;
  name: string;
  address: string;
  gcj02: GeoPoint;
  wgs84: GeoPoint;
  providerParentId: string | null;
};
