import { Type } from "@sinclair/typebox";
import { PineMCPClient } from "./mcp-client.js";
import type { PineVoiceConfig, CallResult } from "./types.js";

/**
 * Register the pine_voice_call tool with OpenClaw.
 * The tool is optional (user must add "pine_voice_call" to tools.allow).
 */
export function registerVoiceCallTool(api: any) {
  api.registerTool(
    {
      name: "pine_voice_call",
      description:
        "Make a phone call via Pine AI voice agent. The agent calls the specified number and handles the " +
        "conversation (including IVR navigation, negotiation, and verification) based on your instructions. " +
        "Provide thorough context and strategy upfront — the agent CANNOT ask for more info mid-call. " +
        "For negotiations, include target outcome, acceptable range, constraints, and leverage points. " +
        "Returns full transcript and summary. Calls typically take 1-30 minutes, up to 120 minutes for complex tasks. " +
        "Powered by Pine AI.",
      parameters: Type.Object({
        to: Type.String({ description: "Phone number to call (E.164 format, e.g. +14155551234)" }),
        callee_name: Type.String({ description: "Name of the person or business being called" }),
        callee_context: Type.String({ description: "Comprehensive context about the callee: who they are, their role, your relationship, relevant account numbers, verification info, and any details the voice agent may need. The agent cannot ask you for more info mid-call, so include everything upfront." }),
        objective: Type.String({ description: "Specific goal the call should accomplish. For negotiations, include your target outcome, acceptable range, and constraints (e.g. 'Negotiate monthly bill down to $50/mo, do not accept above $65/mo, do not change plan tier')." }),
        instructions: Type.Optional(
          Type.String({ description: "Detailed strategy and instructions for the voice agent. For negotiations, describe: what leverage points to use, what offers to accept/reject, fallback positions, and when to walk away. The more thorough the strategy, the better the outcome." }),
        ),
        voice: Type.Optional(Type.String({ enum: ["male", "female"], description: "Voice gender" })),
        max_duration_minutes: Type.Optional(
          Type.Number({ default: 30, minimum: 1, maximum: 120, description: "Maximum call duration in minutes" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        // Read config on each invocation (supports hot-reload)
        const config = api.config?.plugins?.entries?.["pine-voice"]?.config as PineVoiceConfig | undefined;
        if (!config?.access_token) {
          return {
            content: [
              {
                type: "text",
                text: "Pine Voice not configured. Set access_token in plugin config or run: openclaw pine-voice auth setup",
              },
            ],
            isError: true,
          };
        }

        const gatewayUrl = config.gateway_url || "https://voice-api.19pine.ai";
        const client = new PineMCPClient(gatewayUrl, config.access_token);

        try {
          // 1. Initialize MCP session
          await client.initialize();

          // 2. Map OpenClaw param names to MCP tool param names
          const maxDuration = params.max_duration_minutes ?? 30;
          const ttlMs = maxDuration * 60 * 1000 + 120000; // call duration + 2min buffer

          // 3. Invoke tools/call with task param (async mode)
          const task = await client.callTool(
            {
              dialed_number: params.to,
              callee_name: params.callee_name,
              callee_context: params.callee_context,
              call_objective: params.objective,
              detailed_instructions: params.instructions || "",
              voice: params.voice,
              max_duration_minutes: maxDuration,
            },
            ttlMs,
          );

          api.log?.info?.(`pine-voice: call initiated, taskId=${task.taskId}`);

          // 4. Poll tasks/get until terminal
          const completed = await client.waitForTask(task.taskId, {
            pollInterval: task.pollInterval ?? 5000,
            maxWaitMs: maxDuration * 60 * 1000 + 60000,
          });

          if (completed.status === "failed") {
            return {
              content: [{ type: "text", text: `Call failed: ${completed.statusMessage || "Unknown error"}` }],
              isError: true,
            };
          }

          if (completed.status === "cancelled") {
            return {
              content: [{ type: "text", text: "Call was cancelled." }],
              isError: false,
            };
          }

          // 5. Fetch tasks/result for the full result
          const result: CallResult = await client.getTaskResult(task.taskId);

          // 6. Format result for the OpenClaw agent
          return formatResult(result);
        } catch (err: any) {
          api.log?.error?.(`pine-voice: error: ${err.message}`);
          return {
            content: [{ type: "text", text: `Pine Voice Call Error: ${err.message}` }],
            isError: true,
          };
        }
      },
    },
    { optional: true }, // User must add "pine_voice_call" to tools.allow
  );
}

/** Format a CallResult into an OpenClaw tool response. */
function formatResult(result: CallResult) {
  const durationMin = Math.floor(result.duration_seconds / 60);
  const durationSec = result.duration_seconds % 60;
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
