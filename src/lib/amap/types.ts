export type AmapPoi = {
  id: string;
  name: string;
  typecode?: string;
  address?: string | string[];
  location: string;
};

export type AmapSearchResponse = {
  status: string;
  info?: string;
  infocode?: string;
  count?: string;
  pois?: AmapPoi[];
};

export type AmapErrorCode =
  | "AMAP_TIMEOUT"
  | "AMAP_QUOTA"
  | "AMAP_UPSTREAM"
  | "AMAP_INVALID_RESPONSE";

export class AmapProviderError extends Error {
  constructor(
    public readonly code: AmapErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AmapProviderError";
  }
}
