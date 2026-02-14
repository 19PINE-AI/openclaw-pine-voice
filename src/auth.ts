/**
 * Auth flow for Pine Voice plugin.
 * Registers CLI commands for email-based authentication.
 *
 * Auth calls go directly to the Pine AI backend (www.19pine.ai),
 * not through the MCP gateway.
 *
 * Path A: openclaw pine-voice auth setup --email user@example.com
 * Path B: User pastes access_token directly into plugin config
 */

const PINE_AUTH_BASE_URL = "https://www.19pine.ai/api";

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

          console.log(`Requesting verification code for ${opts.email}...`);

          try {
            const resp = await fetch(`${PINE_AUTH_BASE_URL}/v2/auth/email/request`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: opts.email }),
            });

            if (!resp.ok) {
              const body = await resp.text();
              console.error(`Failed: ${resp.status} ${body}`);
              return;
            }

            const result = (await resp.json()) as { status: string; data?: { request_token?: string } };
            const requestToken = result.data?.request_token;

            console.log("Verification code sent! Check your email.");
            if (requestToken) {
              console.log(`Then run: openclaw pine-voice auth verify --email ${opts.email} --code <code> --request-token ${requestToken}`);
            } else {
              console.log(`Then run: openclaw pine-voice auth verify --email ${opts.email} --code <code>`);
            }
          } catch (err: any) {
            console.error(`Error: ${err.message}`);
          }
        });

      pineVoice
        .command("auth verify")
        .description("Verify email code and get access token")
        .option("--email <email>", "Your Pine AI account email")
        .option("--code <code>", "Verification code from email")
        .option("--request-token <token>", "Request token from auth setup step")
        .action(async (opts: any) => {
          if (!opts.code || !opts.email) {
            console.log("Usage: openclaw pine-voice auth verify --email you@example.com --code 1234 --request-token <token>");
            return;
          }

          try {
            const body: Record<string, string> = { email: opts.email, code: opts.code };
            if (opts.requestToken) {
              body.request_token = opts.requestToken;
            }

            const resp = await fetch(`${PINE_AUTH_BASE_URL}/v2/auth/email/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });

            if (!resp.ok) {
              const respBody = await resp.text();
              console.error(`Failed: ${resp.status} ${respBody}`);
              return;
            }

            const result = (await resp.json()) as { status: string; data?: { access_token?: string } };
            const accessToken = result.data?.access_token;
            if (accessToken) {
              console.log("Authentication successful!");
              console.log(`Add this to your pine-voice config:\n  access_token: "${accessToken}"`);
              console.log("\nOr set it in openclaw.json under plugins.entries.pine-voice.config.access_token");
            } else {
              console.log("Verification succeeded but no token returned. Check the response.");
            }
          } catch (err: any) {
            console.error(`Error: ${err.message}`);
          }
        });
    },
    { commands: ["pine-voice"] },
  );
}
