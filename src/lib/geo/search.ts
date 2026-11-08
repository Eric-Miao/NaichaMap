/**
 * One nearby definition for the API, the copy and the map scale.
 * 500 m is roughly a five-minute walk and keeps the first screen walkable.
 */
export const NEARBY_RADIUS_M = 500;
export const NEARBY_RADIUS_LABEL = "500 米";
export const NEARBY_SCALE_LABEL = "500 M";
/** Fetch a little beyond the query radius so stores near the cell edge are cached. */
export const AMAP_FETCH_RADIUS_M = 900;
/** Malls are looked up a little wider so stores at the cell edge still group. */
export const MALL_QUERY_RADIUS_M = 1400;
