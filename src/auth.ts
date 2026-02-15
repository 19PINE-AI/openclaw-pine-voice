/**
 * Auth flow for Pine Voice plugin.
 * Registers CLI commands for email-based authentication.
 *
 * Delegates to the pine-voice SDK for actual API calls.
 */

import { PineVoice } from "pine-voice";

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
            console.log(`Add this to your pine-voice config in ~/.openclaw/openclaw.json:`);
            console.log("");
            console.log(`  "plugins": {`);
            console.log(`    "entries": {`);
            console.log(`      "pine-voice": {`);
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
