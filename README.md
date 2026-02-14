# Pine AI Voice Call - OpenClaw Plugin

Make phone calls via Pine AI's voice agent from OpenClaw. The AI agent calls the specified number, carries out the conversation based on your instructions, and returns a transcript and summary. **The voice agent can only speak English, so calls can only be delivered to English-speaking countries.**

**Powered by [Pine AI](https://pine.ai). Subject to [Pine AI Voice Terms of Service](https://pine.ai/legal/voice-tos).**

## How is this different from the built-in voice-call plugin?

| | Built-in `voice_call` | Pine `pine_voice_call` |
|---|---|---|
| Who is the voice agent? | Your OpenClaw agent | Pine's purpose-trained agent |
| Requires webhook URL? | Yes (ngrok/Tailscale) | No |
| Requires Twilio/Telnyx account? | Yes | No (Pine handles telephony) |
| Real-time conversation control? | Yes | No (delegated) |
| Best for | Custom real-time voice bots | High-quality delegated calls |

## Prerequisites

- Pine AI Pro subscription ([pine.ai](https://pine.ai))

## Install

```bash
openclaw plugins install openclaw-pine-voice
```

Restart the gateway after installation:

```bash
openclaw gateway restart
```

## Configure

Configuration has two parts: enabling the tool for your agent, and authenticating with Pine AI.

### Step 1: Enable the tool for your agent

The `pine_voice_call` tool is registered as optional, which means your agent won't see it until you explicitly allow it. Add it to your agent's tool allowlist in `openclaw.json`:

**To enable for all agents globally**, add `pine_voice_call` to the top-level `tools.allow`:

```json
{
  "tools": {
    "allow": ["pine_voice_call"]
  }
}
```

**To enable for a specific agent only**, add it under that agent's config in `agents.list`:

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "allow": ["pine_voice_call"]
        }
      }
    ]
  }
}
```

> **Note:** If your agent already has a `tools.allow` list with other tools, just append `"pine_voice_call"` to the existing array. If you're using `tools.profile` (e.g., `"coding"` or `"messaging"`), adding `"pine_voice_call"` to `tools.allow` will make it available alongside your profile's default tools — the profile won't be overridden.

### Step 2: Restart the gateway

```bash
openclaw gateway restart
```

Your agent now has access to the `pine_voice_call` tool.

### Step 3: Authenticate with Pine AI

You have two options for when to authenticate:

**Option A: Authenticate now (recommended)**

We recommend authenticating right after installation. The auth flow requires an email verification code, so it's best done while you're actively setting things up — not later when the agent tries to make a call (which could be at any time).

```bash
# 1. Request a verification code (sent to your Pine AI account email)
openclaw pine-voice auth setup --email you@example.com

# 2. Check your email for the code, then verify
openclaw pine-voice auth verify --email you@example.com --code 1234
```

The command prints your access token. Add it to your plugin config in `openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "pine-voice": {
        "enabled": true,
        "config": {
          "gateway_url": "https://agent3-api-gateway-staging.19pine.ai",
          "access_token": "PASTE_YOUR_TOKEN_HERE"
        }
      }
    }
  }
}
```

Then restart the gateway again:

```bash
openclaw gateway restart
```

**Option B: Let the agent handle it on first use**

If you skip authentication, the plugin still loads and the tool is visible to your agent. The first time the agent tries to make a call, it will receive an error explaining that authentication is needed. The agent will then guide you through the email verification flow — it will ask for your email, run the auth commands, and configure the token for you.

This works, but keep in mind: the email verification code arrives in your inbox, so you need to be available to provide it. If the agent tries to make a call while you're away (e.g., in an automated workflow or overnight), it will be blocked until you complete verification.

## Try it out

After setup, test that everything works by making a quick call to your own phone:

```
"Call my phone at +1XXXXXXXXXX. Tell me that Pine Voice is set up and working.
Just confirm the setup is complete and say goodbye."
```

Replace `+1XXXXXXXXXX` with your actual phone number. You'll receive a call from Pine's voice agent, hear it speak, and get a transcript back — this confirms your token, subscription, and the full end-to-end flow are all working.

Then try real tasks:

- "Call John at +14155551234 and schedule a meeting for Tuesday"
- "Phone the restaurant at +14155559876 to make a reservation for tonight at 7pm for 4 people"
- "Call Comcast at +18001234567 and negotiate my bill down to $60/mo. My account is 1234567890, current plan is $89.99/mo. I've been a customer for 8 years. Don't change the plan tier."

### Important: English-speaking countries only

The voice agent can only speak English. Calls can only be placed to phone numbers in English-speaking countries (e.g., US, UK, Canada, Australia) and to recipients who understand English.

### Important: Gather all required information first

The voice agent **cannot ask a human for missing information mid-call**. There is no way for the AI to pause and request details during the conversation. Before making a call, make sure you have gathered all information the callee may need, including any authentication, verification, or payment details relevant to the task.

The exact requirements vary depending on the type of call — anticipate what the callee will ask for and include it upfront. If calling customer service or any entity that verifies identity, **you must include sufficient verification information** — the call will fail without it.

## What happens

1. The tool sends your instructions to Pine's voice agent
2. While the call is in progress, your agent is waiting for the result
3. You receive the full transcript and a summary when done

> **Note:** While a call is in progress, your agent is waiting for the result. If you need to do other tasks simultaneously, use OpenClaw's sub-agents (`sessions_spawn`) to run the call in a background session.

## Limits and pricing

- Each call costs **50 base credits + 20 credits per minute** of duration
- 5 calls per day to the same number, 5 concurrent calls
- Pro subscription required
- MCP voice calls use your existing Pine AI credit balance. All credit sources apply — daily login rewards (300 credits/day), subscription plan credits, and purchased add-ons. Credit policies are governed by the Pine AI app. See [Pine AI Pricing FAQ](https://www.19pine.ai/pricing-faqs) for details.

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| TOKEN_EXPIRED | Access token expired | Re-run `openclaw pine-voice auth setup` |
| SUBSCRIPTION_REQUIRED | Not a Pro subscriber | Subscribe at pine.ai |
| RATE_LIMITED | Too many calls | Wait and try again |
| INSUFFICIENT_DETAIL | Objective too vague | Provide a more specific call objective |
| DND_BLOCKED | Number on do-not-call list | Cannot call this number |

## Development

### Testing locally (before publishing)

**Option A: Link local folder (recommended for development)**

```bash
openclaw plugins install -l /path/to/openclaw-pine-voice
openclaw gateway restart
```

The `-l` flag creates a symlink instead of copying, so edits to your source files take effect after a gateway restart. No need to re-install.

**Option B: Load path in config**

Add the plugin path directly to `openclaw.json` — no install command needed:

```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/openclaw-pine-voice"]
    }
  }
}
```

Restart the gateway to load the plugin.

### Development workflow

```bash
# 1. Link your local plugin
openclaw plugins install -l ./

# 2. Add config to openclaw.json (token, gateway_url, tools.allow)

# 3. Restart gateway
openclaw gateway restart

# 4. Test by chatting with your agent
#    "Call +14155551234 and ask about store hours"

# 5. Edit src/*.ts, restart gateway, test again

# 6. Verify the plugin loads correctly
openclaw plugins list
```

### Publishing to npm

Once tested locally:

```bash
# 1. Login to npm
npm login

# 2. Publish the package
npm publish
```

After publishing, users can install with:

```bash
openclaw plugins install openclaw-pine-voice
```

### Updating a published version

```bash
# Bump version in package.json, then:
npm publish
```

Users update with:

```bash
openclaw plugins update pine-voice
openclaw gateway restart
```

## Terms of Service

This plugin connects to Pine AI's voice calling service. Pine AI is the service provider. All calls are recorded and transcribed. By using this plugin, you agree to [Pine AI's Voice Terms of Service](https://pine.ai/legal/voice-tos).

## License

MIT
