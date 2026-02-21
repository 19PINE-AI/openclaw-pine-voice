/**
 * Auth flow for Pine Voice plugin.
 *
 * Provides two surfaces:
 *  1. Tools (pine_voice_auth_request / pine_voice_auth_verify) — the primary,
 *     conversational path where the AI agent drives the flow.
 *  2. CLI commands (openclaw pine-voice auth setup/verify) — a manual fallback.
 *
 * Delegates to the pine-voice SDK for actual API calls.
 */

import { Type } from "@sinclair/typebox";
import { PineVoice, AuthError } from "pine-voice";

// ---------------------------------------------------------------------------
// Module-level state: stores requestToken between the request and verify steps
// so the AI agent never needs to pass it explicitly.
// ---------------------------------------------------------------------------
const pendingAuth = new Map<string, string>(); // email → requestToken

// ---------------------------------------------------------------------------
// Tool registration (primary path)
// ---------------------------------------------------------------------------

export function registerAuthTools(api: any) {
  // --- Tool: pine_voice_auth_request ---
  api.registerTool({
    name: "pine_voice_auth_request",
    description:
      "Start Pine Voice authentication. Sends a verification code to the user's " +
      "Pine AI account email. After calling this, ask the user to check their email " +
      "(including spam) and provide the code, then call pine_voice_auth_verify.",
    parameters: Type.Object({
      email: Type.String({ description: "The user's Pine AI account email address" }),
    }),
    async execute(_toolCallId: string, params: { email: string }) {
      try {
        const { requestToken } = await PineVoice.auth.requestCode(params.email);
        pendingAuth.set(params.email, requestToken);

        api.log?.info?.(`pine-voice: auth code requested for ${params.email}`);

        return {
          content: [
            {
              type: "text",
              text:
                `Verification code sent to ${params.email}. ` +
                "Ask the user to check their email (including spam folder) and provide the code. " +
                "Then call pine_voice_auth_verify with the email and code.",
            },
          ],
          isError: false,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        api.log?.error?.(`pine-voice: auth request failed: ${message}`);

        const hint =
          err instanceof AuthError && (err as any).status >= 400 && (err as any).status < 500
            ? " The email may not be registered — the user can sign up at https://19pine.ai."
            : "";

        return {
          content: [{ type: "text", text: `Pine Voice auth request failed: ${message}.${hint}` }],
          isError: true,
        };
      }
    },
  });

  // --- Tool: pine_voice_auth_verify ---
  api.registerTool({
    name: "pine_voice_auth_verify",
    description:
      "Complete Pine Voice authentication. Verifies the code the user received by email, " +
      "saves the credentials to openclaw.json, and tells the user to restart the gateway. " +
      "Must be called after pine_voice_auth_request.",
    parameters: Type.Object({
      email: Type.String({ description: "The same email used in pine_voice_auth_request" }),
      code: Type.String({ description: "The verification code from the user's email" }),
      request_token: Type.Optional(
        Type.String({ description: "Request token from pine_voice_auth_request (usually not needed — resolved automatically)" }),
      ),
    }),
    async execute(_toolCallId: string, params: { email: string; code: string; request_token?: string }) {
      const requestToken = params.request_token || pendingAuth.get(params.email);

      if (!requestToken) {
        return {
          content: [
            {
              type: "text",
              text:
                "No pending auth request found for this email. " +
                "Call pine_voice_auth_request first to send a new verification code.",
            },
          ],
          isError: true,
        };
      }

      try {
        const { accessToken, userId } = await PineVoice.auth.verifyCode(
          params.email,
          requestToken,
          params.code,
        );

        // Write credentials + ensure voice tools are in tools.allow
        const cfg = api.runtime.config.loadConfig();
        const plugins = (cfg.plugins ?? {}) as Record<string, any>;
        const entries = (plugins.entries ?? {}) as Record<string, any>;
        const pluginEntry = (entries["openclaw-pine-voice"] ?? {}) as Record<string, any>;
        const tools = (cfg.tools ?? {}) as Record<string, any>;
        const existingAllow = Array.isArray(tools.allow) ? tools.allow as string[] : [];

        const requiredTools = [
          "pine_voice_call_and_wait",
          "pine_voice_call",
          "pine_voice_call_status",
        ];
        const missingTools = requiredTools.filter(t => !existingAllow.includes(t));
        const mergedAllow = [...existingAllow, ...missingTools];

        const updatedConfig = {
          ...cfg,
          plugins: {
            ...plugins,
            entries: {
              ...entries,
              "openclaw-pine-voice": {
                ...pluginEntry,
                config: {
                  ...(pluginEntry.config ?? {}),
                  access_token: accessToken,
                  user_id: userId,
                },
              },
            },
          },
          tools: {
            ...tools,
            allow: mergedAllow,
          },
        };

        await api.runtime.config.writeConfigFile(updatedConfig);
        pendingAuth.delete(params.email);

        const toolsNote = missingTools.length > 0
          ? ` Voice tools (${missingTools.join(", ")}) have been added to tools.allow.`
          : "";

        api.log?.info?.(`pine-voice: auth successful for ${params.email}, credentials saved`);
        if (missingTools.length > 0) {
          api.log?.info?.(`pine-voice: added ${missingTools.join(", ")} to tools.allow`);
        }

        return {
          content: [
            {
              type: "text",
              text:
                `Authentication successful! Credentials have been saved to openclaw.json.${toolsNote} ` +
                "Tell the user to restart the gateway for the changes to take effect:\n\n" +
                "  openclaw gateway restart",
            },
          ],
          isError: false,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        api.log?.error?.(`pine-voice: auth verify failed: ${message}`);

        const isExpired = message.toLowerCase().includes("expired");
        const hint = isExpired
          ? " The request token has expired — call pine_voice_auth_request again to send a new code."
          : " Ask the user to double-check the code and try again.";

        return {
          content: [{ type: "text", text: `Pine Voice auth verification failed: ${message}.${hint}` }],
          isError: true,
        };
      }
    },
  });
}

// ---------------------------------------------------------------------------
// CLI registration (manual fallback)
// ---------------------------------------------------------------------------

export function registerAuthCommands(api: any) {
  api.registerCli?.(
    ({ program }: any) => {
      const pineVoice = program.command("pine-voice").description("Pine AI Voice Call plugin");
      const auth = pineVoice.command("auth").description("Pine AI authentication");

      auth
        .command("setup")
        .description("Set up Pine AI authentication")
        .option("--email <email>", "Your Pine AI account email")
        .action(async (opts: any) => {
          if (!opts.email) {
            console.log("Usage: openclaw pine-voice auth setup --email you@example.com");
            return;
          }

          console.log(`Requesting verification code for ${opts.email}...`);

          try {
            const { requestToken } = await PineVoice.auth.requestCode(opts.email);

            console.log("Verification code sent! Check your email.");
            console.log(`Then run: openclaw pine-voice auth verify --email ${opts.email} --request-token ${requestToken} --code <code>`);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`Error: ${message}`);
          }
        });

      auth
        .command("verify")
        .description("Verify email code and get access token")
        .option("--email <email>", "Your Pine AI account email")
        .option("--request-token <token>", "Request token from auth setup step")
        .option("--code <code>", "Verification code from email")
        .action(async (opts: any) => {
          if (!opts.code || !opts.email || !opts.requestToken) {
            console.log("Usage: openclaw pine-voice auth verify --email you@example.com --request-token <token> --code 1234");
            return;
          }

          try {
            const { accessToken, userId } = await PineVoice.auth.verifyCode(
              opts.email,
              opts.requestToken || "",
              opts.code,
            );

            console.log("Authentication successful!");
            console.log(`Add this to your plugin config in ~/.openclaw/openclaw.json:`);
            console.log("");
            console.log(`  "plugins": {`);
            console.log(`    "entries": {`);
            console.log(`      "openclaw-pine-voice": {`);
            console.log(`        "config": {`);
            console.log(`          "access_token": "${accessToken}",`);
            console.log(`          "user_id": "${userId}"`);
            console.log(`        }`);
            console.log(`      }`);
            console.log(`    }`);
            console.log(`  }`);
            console.log("");
            console.log("Then restart the gateway:");
            console.log("  openclaw gateway restart");
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`Error: ${message}`);
          }
        });
    },
    { commands: ["pine-voice"] },
  );
}
