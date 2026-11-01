export type Monitor = {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  method: "GET" | "HEAD";
  intervalSeconds: number;
  timeoutMs: number;
  expectedStatus: number;
  enabled: boolean;
  consecutiveFails: number;
  lastCheckedAt: string | null;
  nextCheckAt: string;
  createdAt: string;
};

export type CheckResult = {
  id: string;
  monitorId: string;
  checkedAt: string;
  success: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
};

export type ApiError = {
  error?: { code?: string; message?: string };
};
