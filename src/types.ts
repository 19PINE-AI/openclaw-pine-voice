/** Plugin configuration from openclaw.plugin.json configSchema */
export interface PineVoiceConfig {
  gateway_url?: string;
  access_token?: string;
}

/** MCP JSON-RPC 2.0 request */
export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

/** MCP JSON-RPC 2.0 response */
export interface JSONRPCResponse {
  jsonrpc: "2.0";
  id?: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

/** MCP Task object per SEP-1686 */
export interface MCPTask {
  taskId: string;
  status: "working" | "input_required" | "completed" | "failed" | "cancelled";
  statusMessage?: string;
  createdAt: string;
  lastUpdatedAt: string;
  ttl?: number;
  pollInterval?: number;
  callId?: string;
  result?: CallResult;
}

/** Result returned by pine_voice_call tool */
export interface CallResult {
  call_id: string;
  status: "completed" | "failed" | "cancelled";
  duration_seconds: number;
  summary: string;
  transcript: Array<{ speaker: string; text: string }>;
  triage_category: "successful" | "partially_successful" | "unsuccessful" | "no_contact";
  credits_charged: number;
}

/** Error info from MCP */
export interface MCPError {
  code: string;
  message: string;
  retryable: boolean;
}

/** Known error codes and their retry semantics */
export const ERROR_MESSAGES: Record<string, { message: string; retryable: boolean }> = {
  INSUFFICIENT_DETAIL: { message: "The call instructions are too vague. Please provide a specific objective and more context.", retryable: true },
  POLICY_VIOLATION: { message: "This call request was rejected due to policy restrictions.", retryable: false },
  NUMBER_MISMATCH: { message: "The phone number doesn't match the provided callee information. Please verify.", retryable: true },
  RATE_LIMITED: { message: "Too many calls. Please wait before trying again.", retryable: true },
  DND_BLOCKED: { message: "This number has requested not to be called.", retryable: false },
  SUBSCRIPTION_REQUIRED: { message: "A Pine AI Pro subscription is required. Visit pine.ai to subscribe.", retryable: false },
  TOKEN_EXPIRED: { message: "Pine authentication expired. Re-configure your access_token.", retryable: false },
  BILLING_DEBT: { message: "Outstanding balance on Pine account. Please resolve at pine.ai before making calls.", retryable: false },
  TOS_REQUIRED: { message: "Please accept Pine AI Voice Terms of Service first.", retryable: true },
  KILL_SWITCH_ACTIVE: { message: "Pine Voice service is temporarily unavailable. Please try again later.", retryable: false },
  PROMPT_INJECTION: { message: "Request contains disallowed content.", retryable: false },
};
