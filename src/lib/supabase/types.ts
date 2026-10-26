export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type StoreCategory = "tea_drink" | "beverage" | "coffee";
type StoreStatus = "active" | "pending_review" | "possibly_closed" | "hidden";
type SearchFetchStatus = "idle" | "fetching" | "succeeded" | "failed";
type CorrectionIssueType = "not_exists" | "incorrect_info" | "missing_store" | "other";
type CorrectionStatus = "pending" | "accepted" | "rejected";

type TableDefinition<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      brands: TableDefinition<
        {
          id: string;
          canonical_name: string;
          aliases: string[];
          category: StoreCategory;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          canonical_name: string;
          aliases?: string[];
          category: StoreCategory;
          created_at?: string;
          updated_at?: string;
        }
      >;
      malls: TableDefinition<
        {
          id: string;
          provider: string;
          provider_place_id: string;
          name: string;
          address: string;
          location_gcj02_lng: number;
          location_gcj02_lat: number;
          location_wgs84: unknown;
          boundary_wgs84: unknown | null;
          last_seen_at: string;
          last_verified_at: string | null;
          manual_lock: boolean;
        },
        {
          id?: string;
          provider: string;
          provider_place_id: string;
          name: string;
          address?: string;
          location_gcj02_lng: number;
          location_gcj02_lat: number;
          location_wgs84: unknown;
          boundary_wgs84?: unknown | null;
          last_seen_at?: string;
          last_verified_at?: string | null;
          manual_lock?: boolean;
        }
      >;
      stores: TableDefinition<
        {
          id: string;
          provider: string;
          provider_place_id: string;
          brand_id: string | null;
          name: string;
          branch_name: string | null;
          category: StoreCategory;
          address: string;
          mall_id: string | null;
          location_gcj02_lng: number;
          location_gcj02_lat: number;
          location_wgs84: unknown;
          status: StoreStatus;
          first_seen_at: string;
          last_seen_at: string;
          last_verified_at: string | null;
          manual_lock_fields: string[];
        },
        {
          id?: string;
          provider: string;
          provider_place_id: string;
          brand_id?: string | null;
          name: string;
          branch_name?: string | null;
          category: StoreCategory;
          address?: string;
          mall_id?: string | null;
          location_gcj02_lng: number;
          location_gcj02_lat: number;
          location_wgs84: unknown;
          status?: StoreStatus;
          first_seen_at?: string;
          last_seen_at?: string;
          last_verified_at?: string | null;
          manual_lock_fields?: string[];
        }
      >;
      search_areas: TableDefinition<
        {
          cell_id: string;
          center_wgs84: unknown;
          radius_meters: number;
          last_fetched_at: string | null;
          expires_at: string | null;
          result_count: number;
          fetch_status: SearchFetchStatus;
          lease_token: string | null;
          lease_expires_at: string | null;
        },
        {
          cell_id: string;
          center_wgs84: unknown;
          radius_meters?: number;
          last_fetched_at?: string | null;
          expires_at?: string | null;
          result_count?: number;
          fetch_status?: SearchFetchStatus;
          lease_token?: string | null;
          lease_expires_at?: string | null;
        }
      >;
      correction_logs: TableDefinition<
        {
          id: string;
          store_id: string | null;
          issue_type: CorrectionIssueType;
          details: string;
          submitted_store_name: string | null;
          submitted_address: string | null;
          ip_hash: string;
          status: CorrectionStatus;
          created_at: string;
          processed_at: string | null;
        },
        {
          id?: string;
          store_id?: string | null;
          issue_type: CorrectionIssueType;
          details: string;
          submitted_store_name?: string | null;
          submitted_address?: string | null;
          ip_hash: string;
          status?: CorrectionStatus;
          created_at?: string;
          processed_at?: string | null;
        }
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      nearby_stores: {
        Args: { p_lng: number; p_lat: number; p_radius_m?: number };
        Returns: Array<{
          store_id: string;
          provider: string;
          provider_place_id: string;
          name: string;
          branch_name: string | null;
          category: StoreCategory;
          address: string;
          mall_id: string | null;
          mall_name: string | null;
          mall_address: string | null;
          longitude: number;
          latitude: number;
          distance_m: number;
        }>;
      };
      claim_search_area: {
        Args: { p_cell_id: string; p_center_lng: number; p_center_lat: number; p_now?: string };
        Returns: Array<{ should_fetch: boolean; lease_token: string | null; has_stale_data: boolean }>;
      };
      finish_search_area: {
        Args: { p_cell_id: string; p_lease_token: string; p_result_count: number; p_success: boolean };
        Returns: boolean;
      };
      submit_correction: {
        Args: {
          p_store_id: string | null;
          p_issue_type: CorrectionIssueType;
          p_details: string;
          p_submitted_store_name: string | null;
          p_submitted_address: string | null;
          p_ip_hash: string;
        };
        Returns: Array<{ accepted: boolean; retry_after_seconds: number; correction_id: string | null }>;
      };
    };
    Enums: {
      store_category: StoreCategory;
      store_status: StoreStatus;
      search_fetch_status: SearchFetchStatus;
      correction_issue_type: CorrectionIssueType;
      correction_status: CorrectionStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
