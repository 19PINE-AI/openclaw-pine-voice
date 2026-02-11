import { registerVoiceCallTool } from "./tool.js";
import { registerAuthCommands } from "./auth.js";

/**
 * Pine AI Voice Call plugin for OpenClaw.
 *
 * Registers:
 * - pine_voice_call tool (optional, user must add to tools.allow)
 * - pine-voice CLI commands (auth setup/verify)
 *
 * The plugin is a thin MCP client that speaks JSON-RPC to Pine's MCP server.
 * All safety, billing, and prompt logic lives on Pine's side.
 */
export default function register(api: any) {
  // Register the voice call tool
  registerVoiceCallTool(api);

  // Register CLI commands for authentication
  registerAuthCommands(api);

  api.log?.info?.("pine-voice: plugin loaded");
}

// Also export as named for module compatibility
export const id = "pine-voice";
export const name = "Pine AI Voice Call";
