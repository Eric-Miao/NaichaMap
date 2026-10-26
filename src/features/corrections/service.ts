import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

import type { CorrectionResult, CorrectionRpcInput, CorrectionSubmission } from "./contracts";
import { hashClientIp } from "./ip";

type CorrectionRpc = (input: CorrectionRpcInput) => Promise<CorrectionResult>;
type PrivateCorrectionInput = CorrectionSubmission & { ip: string; salt: string };

export function createCorrectionService(rpc: CorrectionRpc) {
  return async function submitCorrection(input: PrivateCorrectionInput) {
    return rpc({
      storeId: input.storeId ?? null,
      issueType: input.issueType,
      details: input.details,
      submittedStoreName: input.submittedStoreName ?? null,
      submittedAddress: input.submittedAddress ?? null,
      ipHash: hashClientIp(input.ip, input.salt),
    });
  };
}

const callCorrectionRpc: CorrectionRpc = async (input) => {
  const client = createAdminClient();
  const { data, error } = await client.rpc("submit_correction", {
    p_store_id: input.storeId,
    p_issue_type: input.issueType,
    p_details: input.details,
    p_submitted_store_name: input.submittedStoreName,
    p_submitted_address: input.submittedAddress,
    p_ip_hash: input.ipHash,
  });
  if (error) throw error;
  const result = data[0];
  return {
    accepted: result.accepted,
    retryAfterSeconds: result.retry_after_seconds,
    correctionId: result.correction_id,
  };
};

export const submitCorrection = createCorrectionService(callCorrectionRpc);
