/** Plugin configuration from openclaw.plugin.json configSchema */
export interface PineVoiceConfig {
  gateway_url?: string;
  access_token?: string;
  user_id?: string;
}

/** Result returned by the v2 voice call status endpoint */
export interface CallResult {
  call_id: string;
  status: "completed" | "failed" | "cancelled";
  duration_seconds: number;
  summary: string;
  transcript: Array<{ speaker: string; text: string }>;
  triage_category: "successful" | "partially_successful" | "unsuccessful" | "no_contact";
  credits_charged: number;
}
