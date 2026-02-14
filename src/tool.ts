import { Type } from "@sinclair/typebox";
import type { PineVoiceConfig, CallResult } from "./types.js";

/** Auth error message returned when credentials are missing. */
const AUTH_MISSING_MESSAGE = [
  "Pine Voice is not authenticated yet. Both a user ID and access token are required before making calls.",
  "",
  "To set up authentication, run these commands in the terminal:",
  "",
  "  # Step 1: Request a verification code (sent to your Pine AI account email)",
  "  openclaw pine-voice auth setup --email <USER_EMAIL>",
  "",
  "  # Step 2: Enter the code from your email to get your user ID and access token",
  "  openclaw pine-voice auth verify --email <USER_EMAIL> --code <CODE>",
  "",
  "  # Step 3: Add both values to your plugin config in openclaw.json:",
  '  #   plugins.entries.pine-voice.config.user_id = "<USER_ID>"',
  '  #   plugins.entries.pine-voice.config.access_token = "<TOKEN>"',
  "",
  "  # Step 4: Restart the gateway",
  "  openclaw gateway restart",
  "",
  "Ask the user for their Pine AI account email to begin. If they don't have a Pine AI account, they can sign up at https://pine.ai.",
].join("\n");

const AUTH_EXPIRED_MESSAGE = [
  "Pine Voice authentication has expired or is invalid.",
  "",
  "To re-authenticate, run:",
  "  openclaw pine-voice auth setup --email <USER_EMAIL>",
  "  openclaw pine-voice auth verify --email <USER_EMAIL> --code <CODE>",
  "",
  "Then update user_id and access_token in openclaw.json and restart the gateway.",
  "Ask the user for their Pine AI account email to begin.",
].join("\n");

/** Read plugin config and build request headers. Returns error response if not authenticated. */
function getConfigOrError(api: any): { gatewayUrl: string; headers: Record<string, string> } | { content: Array<{ type: string; text: string }>; isError: true } {
  const config = api.config?.plugins?.entries?.["pine-voice"]?.config as PineVoiceConfig | undefined;
  if (!config?.access_token || !config?.user_id) {
    return { content: [{ type: "text", text: AUTH_MISSING_MESSAGE }], isError: true };
  }
  const gatewayUrl = (config.gateway_url || "https://agent3-api-gateway-staging.19pine.ai").replace(/\/$/, "");
  return {
    gatewayUrl,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.access_token}`,
      "X-Pine-User-Id": config.user_id,
    },
  };
}

/** Detect auth errors and return a formatted error response. */
function handleError(api: any, err: any) {
  api.log?.error?.(`pine-voice: error: ${err.message}`);
  const msg = err.message || "";
  if (msg.includes("401") || msg.includes("TOKEN_EXPIRED") || msg.includes("Unauthorized")) {
    return { content: [{ type: "text", text: AUTH_EXPIRED_MESSAGE }], isError: true };
  }
  return { content: [{ type: "text", text: `Pine Voice Call Error: ${err.message}` }], isError: true };
}

/**
 * Register pine_voice_call and pine_voice_call_status tools with OpenClaw.
 * Both tools are optional (user must add them to tools.allow).
 *
 * Uses the v2 REST API (POST to initiate, GET to poll) rather than MCP JSON-RPC
 * for simplicity. The REST API shares the same Redis storage as MCP, so results
 * from either path are interchangeable.
 */
export function registerVoiceCallTools(api: any) {
  // --- Tool 1: pine_voice_call (initiate) ---
  api.registerTool(
    {
      name: "pine_voice_call",
      description:
        "Make a phone call via Pine AI voice agent. The agent calls the specified number and handles the " +
        "conversation (including IVR navigation, negotiation, and verification) based on your instructions. " +
        "Important: the voice agent can only speak English, so calls can only be delivered to English-speaking " +
        "countries and recipients who understand English. " +
        "BEFORE calling this tool, you MUST gather from the user all information that may be needed during " +
        "the call, including any authentication, verification, or payment details the callee may require. " +
        "The voice agent has no way to contact a human for missing information mid-call — anticipate what " +
        "the callee will ask for and include it upfront. " +
        "For negotiations, include target outcome, acceptable range, constraints, and leverage points. " +
        "Returns immediately with a call_id. Use pine_voice_call_status to check progress and get results. " +
        "Powered by Pine AI.",
      parameters: Type.Object({
        to: Type.String({ description: "Phone number to call (E.164 format, e.g. +14155551234). Must be a number in an English-speaking country, as the voice agent can only speak English." }),
        callee_name: Type.String({ description: "Name of the person or business being called" }),
        callee_context: Type.String({ description: "Comprehensive context about the callee and all information needed for the call. Include: who they are, your relationship, and any authentication, verification, or payment details the callee may require. The voice agent CANNOT ask a human for missing information mid-call, so you must anticipate what will be needed and include everything upfront." }),
        objective: Type.String({ description: "Specific goal the call should accomplish. For negotiations, include your target outcome, acceptable range, and constraints (e.g. 'Negotiate monthly bill down to $50/mo, do not accept above $65/mo, do not change plan tier')." }),
        instructions: Type.Optional(
          Type.String({ description: "Detailed strategy and instructions for the voice agent. For negotiations, describe: what leverage points to use, what offers to accept/reject, fallback positions, and when to walk away. The more thorough the strategy, the better the outcome." }),
        ),
        voice: Type.Optional(Type.String({ enum: ["male", "female"], description: "Voice gender" })),
        max_duration_minutes: Type.Optional(
          Type.Number({ default: 120, minimum: 1, maximum: 120, description: "Maximum call duration in minutes" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        const configOrErr = getConfigOrError(api);
        if ("isError" in configOrErr) return configOrErr;
        const { gatewayUrl, headers } = configOrErr;

        try {
          const res = await fetch(`${gatewayUrl}/api/v2/voice/call`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              dialed_number: params.to,
              callee_name: params.callee_name,
              callee_context: params.callee_context,
              call_objective: params.objective,
              detailed_instructions: params.instructions || "",
              voice: params.voice,
              max_duration_minutes: params.max_duration_minutes ?? 120,
            }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => null);
            const errCode = body?.error?.code || "";
            const errMsg = body?.error?.message || `HTTP ${res.status}`;
            if (res.status === 401 || errCode === "TOKEN_EXPIRED") {
              return { content: [{ type: "text", text: AUTH_EXPIRED_MESSAGE }], isError: true };
            }
            return { content: [{ type: "text", text: `Call initiation failed: ${errCode}: ${errMsg}` }], isError: true };
          }

          const { call_id } = await res.json();
          api.log?.info?.(`pine-voice: call initiated, call_id=${call_id}`);

          return {
            content: [
              {
                type: "text",
                text: `Call initiated (call_id: ${call_id}).\n\nUse pine_voice_call_status with call_id "${call_id}" to check progress. Poll every 30 seconds until the call completes.`,
              },
            ],
            structuredContent: { call_id, status: "initiated" },
            isError: false,
          };
        } catch (err: any) {
          return handleError(api, err);
        }
      },
    },
    { optional: true },
  );

  // --- Tool 2: pine_voice_call_status (query) ---
  api.registerTool(
    {
      name: "pine_voice_call_status",
      description:
        "Check the status of a phone call initiated by pine_voice_call. " +
        "Returns the current status and, when the call is complete, the full transcript, summary, and " +
        "triage result. Poll this tool every 30 seconds after initiating a call until the status is " +
        "terminal (completed, failed, or cancelled). Powered by Pine AI.",
      parameters: Type.Object({
        call_id: Type.String({ description: "The call_id returned by pine_voice_call" }),
      }),
      async execute(_toolCallId: string, params: any) {
        const configOrErr = getConfigOrError(api);
        if ("isError" in configOrErr) return configOrErr;
        const { gatewayUrl, headers } = configOrErr;

        try {
          const res = await fetch(`${gatewayUrl}/api/v2/voice/call/${encodeURIComponent(params.call_id)}`, {
            headers,
          });

          if (!res.ok) {
            const body = await res.json().catch(() => null);
            const errCode = body?.error?.code || "";
            const errMsg = body?.error?.message || `HTTP ${res.status}`;
            if (res.status === 401 || errCode === "TOKEN_EXPIRED") {
              return { content: [{ type: "text", text: AUTH_EXPIRED_MESSAGE }], isError: true };
            }
            if (res.status === 404) {
              return { content: [{ type: "text", text: `Call not found: ${params.call_id}` }], isError: true };
            }
            return { content: [{ type: "text", text: `Status check failed: ${errCode}: ${errMsg}` }], isError: true };
          }

          const data = await res.json();

          // Terminal states: return formatted result
          if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
            return formatResult(data as CallResult);
          }

          // Non-terminal: return progress message
          const elapsed = data.duration_seconds ? formatDuration(data.duration_seconds) : "unknown";
          return {
            content: [
              {
                type: "text",
                text: `Call is still in progress (${elapsed} elapsed).\n\nCall again in 30 seconds to check status.`,
              },
            ],
            structuredContent: { call_id: params.call_id, status: data.status || "in_progress" },
            isError: false,
          };
        } catch (err: any) {
          return handleError(api, err);
        }
      },
    },
    { optional: true },
  );
}

/** Format a CallResult into an OpenClaw tool response. */
function formatResult(result: CallResult) {
  if (result.status === "failed") {
    return {
      content: [{ type: "text", text: `Call failed: ${result.summary || "Unknown error"}` }],
      structuredContent: result,
      isError: true,
    };
  }

  if (result.status === "cancelled") {
    return {
      content: [{ type: "text", text: "Call was cancelled." }],
      structuredContent: result,
      isError: false,
    };
  }

  const durationMin = Math.floor((result.duration_seconds || 0) / 60);
  const durationSec = (result.duration_seconds || 0) % 60;
  const lines = [
    `**Call ${result.status}** (${result.triage_category})`,
    `Duration: ${durationMin}m ${durationSec}s | Credits charged: ${result.credits_charged}`,
    "",
    `**Summary:** ${result.summary}`,
  ];

  if (result.transcript?.length > 0) {
    lines.push("", "**Transcript:**");
    for (const entry of result.transcript) {
      lines.push(`- **${entry.speaker}:** ${entry.text}`);
    }
  }

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: result,
    isError: false,
  };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
