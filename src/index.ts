import { registerVoiceCallTools } from "./tool.js";
import { registerAuthTools, registerAuthCommands } from "./auth.js";

/**
 * Pine AI Voice Call plugin for OpenClaw.
 *
 * Registers:
 * - pine_voice_call tool (initiate a phone call, returns immediately)
 * - pine_voice_call_status tool (check call progress / get results)
 * - pine_voice_call_and_wait tool (initiate + wait for result)
 * - pine_voice_auth_request tool (start email-based auth)
 * - pine_voice_auth_verify tool (complete auth and save credentials)
 * - pine-voice CLI commands (auth setup/verify — manual fallback)
 *
 * Delegates all API calls to the pine-voice SDK. All safety, billing,
 * and prompt logic lives on Pine's side.
 *
 * For non-blocking calls, the pine-voice skill instructs the AI to use
 * sessions_spawn so the main agent stays responsive during long calls.
 */
export default function register(api: any) {
  // Register voice call tools (initiate + status + wait)
  registerVoiceCallTools(api);

  // Register auth tools (conversational flow — primary)
  registerAuthTools(api);

  // Register CLI commands for authentication (manual fallback)
  registerAuthCommands(api);

  api.log?.info?.("pine-voice: plugin loaded");
}

// Also export as named for module compatibility
export const id = "pine-voice";
export const name = "Pine AI Voice Call";
