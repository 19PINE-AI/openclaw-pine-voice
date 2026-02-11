# Pine AI Voice Call - OpenClaw Plugin

Make phone calls via Pine AI's voice agent from OpenClaw. The AI agent calls the specified number, carries out the conversation based on your instructions, and returns a transcript and summary.

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

Configuration has three parts: obtaining your access token, adding it to the plugin config, and enabling the tool for your agent.

### Step 1: Obtain your Pine access token

An access token is obtained via email verification using your Pine AI account email. Choose one of these methods:

**Method A: Via the plugin CLI** (recommended)

```bash
# 1. Request a verification code (you'll receive it by email)
openclaw pine-voice auth setup --email you@example.com

# 2. Check your email for the 6-digit code, then verify
openclaw pine-voice auth verify --email you@example.com --code 123456
```

The command prints your access token. Copy it for the next step.

**Method B: Via curl**

```bash
# 1. Request a verification code
curl -X POST https://voice-api.19pine.ai/api/v2/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com"}'

# 2. Check your email for the 6-digit code, then verify
curl -X POST https://voice-api.19pine.ai/api/v2/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "code": "123456"}'
```

The JSON response includes an `access_token` field. Copy it for the next step.

### Step 2: Add the token to your plugin config

Open your `openclaw.json` and add the plugin entry with your token:

```json
{
  "plugins": {
    "entries": {
      "pine-voice": {
        "enabled": true,
        "config": {
          "gateway_url": "https://voice-api.19pine.ai",
          "access_token": "PASTE_YOUR_TOKEN_HERE"
        }
      }
    }
  }
}
```

### Step 3: Enable the tool for your agent

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

### Step 4: Restart the gateway

After changing the config, restart the gateway to pick up the changes:

```bash
openclaw gateway restart
```

Your agent should now have access to the `pine_voice_call` tool.

## Use it

Send a message to your OpenClaw agent:

- "Call John at +14155551234 and schedule a meeting for Tuesday"
- "Phone the restaurant at +14155559876 to make a reservation for tonight at 7pm for 4 people"
- "Call Comcast at +18001234567 and negotiate my bill down to $60/mo. My account is 1234567890, current plan is $89.99/mo. I've been a customer for 8 years. Don't change the plan tier."

### Important: Provide thorough context

The voice agent **cannot ask you for more info mid-call**. For the best results:
- Include account numbers, verification info, and any relevant details upfront
- For negotiations, provide your target, acceptable range, constraints, and strategy
- The more complete the context, the better the outcome

## What happens

1. The tool sends your instructions to Pine's voice agent
2. The call typically takes 1-30 minutes (up to 120 minutes for complex tasks)
3. While the call is in progress, your agent is waiting for the result
4. You receive the full transcript and a summary when done

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
