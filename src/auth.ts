/**
 * Auth flow for Pine Voice plugin.
 * Registers CLI commands for email-based authentication.
 *
 * Path A: openclaw pine-voice auth setup --email user@example.com
 * Path B: User pastes access_token directly into plugin config
 */
export function registerAuthCommands(api: any) {
  api.registerCli?.(
    ({ program }: any) => {
      const pineVoice = program.command("pine-voice").description("Pine AI Voice Call plugin");

      pineVoice
        .command("auth setup")
        .description("Set up Pine AI authentication")
        .option("--email <email>", "Your Pine AI account email")
        .action(async (opts: any) => {
          if (!opts.email) {
            console.log("Usage: openclaw pine-voice auth setup --email you@example.com");
            return;
          }

          const config = api.config?.plugins?.entries?.["pine-voice"]?.config;
          const gatewayUrl = config?.gateway_url || "https://voice-api.19pine.ai";

          console.log(`Requesting verification code for ${opts.email}...`);

          try {
            const resp = await fetch(`${gatewayUrl}/api/v2/auth/setup`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: opts.email }),
            });

            if (!resp.ok) {
              const body = await resp.text();
              console.error(`Failed: ${resp.status} ${body}`);
              return;
            }

            console.log("Verification code sent! Check your email.");
            console.log("Then run: openclaw pine-voice auth verify --code <code>");
          } catch (err: any) {
            console.error(`Error: ${err.message}`);
          }
        });

      pineVoice
        .command("auth verify")
        .description("Verify email code and get access token")
        .option("--email <email>", "Your Pine AI account email")
        .option("--code <code>", "Verification code from email")
        .action(async (opts: any) => {
          if (!opts.code || !opts.email) {
            console.log("Usage: openclaw pine-voice auth verify --email you@example.com --code 123456");
            return;
          }

          const config = api.config?.plugins?.entries?.["pine-voice"]?.config;
          const gatewayUrl = config?.gateway_url || "https://voice-api.19pine.ai";

          try {
            const resp = await fetch(`${gatewayUrl}/api/v2/auth/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: opts.email, code: opts.code }),
            });

            if (!resp.ok) {
              const body = await resp.text();
              console.error(`Failed: ${resp.status} ${body}`);
              return;
            }

            const data = (await resp.json()) as { access_token?: string };
            if (data.access_token) {
              console.log("Authentication successful!");
              console.log(`Add this to your pine-voice config:\n  access_token: "${data.access_token}"`);
              console.log("\nOr set it in openclaw.json under plugins.entries.pine-voice.config.access_token");
            } else {
              console.log("Verification succeeded but no token returned. Check backend logs.");
            }
          } catch (err: any) {
            console.error(`Error: ${err.message}`);
          }
        });
    },
    { commands: ["pine-voice"] },
  );
}
