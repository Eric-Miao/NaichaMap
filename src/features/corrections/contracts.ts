export const CORRECTION_ISSUE_TYPES = [
  "not_exists",
  "incorrect_info",
  "missing_store",
  "other",
] as const;

export type CorrectionIssueType = (typeof CORRECTION_ISSUE_TYPES)[number];

export type CorrectionSubmission = {
  storeId?: string | null;
  issueType: CorrectionIssueType;
  details: string;
  submittedStoreName?: string | null;
  submittedAddress?: string | null;
};

export type CorrectionRpcInput = {
  storeId: string | null;
  issueType: CorrectionIssueType;
  details: string;
  submittedStoreName: string | null;
  submittedAddress: string | null;
  ipHash: string;
};

export type CorrectionResult = {
  accepted: boolean;
  retryAfterSeconds: number;
  correctionId: string | null;
};
