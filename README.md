# Pine AI Voice Call - OpenClaw Plugin

Make phone calls via Pine AI's voice agent from OpenClaw. The AI agent calls the specified number, carries out the conversation based on your instructions, and returns a full transcript (and an optional LLM-generated summary if requested). The voice agent can only speak English.

**Powered by [Pine AI](https://19pine.ai).**

## How is this different from the built-in voice-call plugin?

| | Built-in `voice_call` | Pine `pine_voice_call` |
|---|---|---|
| Who is the voice agent? | Your OpenClaw agent | Pine's purpose-trained agent |
| Requires webhook URL? | Yes (ngrok/Tailscale) | No |
| Requires Twilio/Telnyx account? | Yes | No (Pine handles telephony) |
| Real-time conversation control? | Yes | No (delegated) |
| Best for | Custom real-time voice bots | High-quality delegated calls |

## Prerequisites

- Pine AI Pro subscription ([19pine.ai](https://19pine.ai))

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

The plugin provides three tools (all registered as optional):

| Tool | Description |
|---|---|
| `pine_voice_call_and_wait` | **Recommended.** Initiates a call and blocks until it completes, returning the full transcript in one tool call. Uses SSE to wait for the final result with automatic polling fallback. |
| `pine_voice_call` | Initiates a call and returns immediately with a `call_id`. Use with `pine_voice_call_status` for manual polling. |
| `pine_voice_call_status` | Checks the status of a call initiated by `pine_voice_call`. |

Your agent won't see these tools until you explicitly allow them. Add them to your agent's tool allowlist in `openclaw.json`:

**To enable for all agents globally**, add the tools to the top-level `tools.allow`:

```json
{
  "tools": {
    "allow": ["pine_voice_call_and_wait"]
  }
}
```

> **Tip:** `pine_voice_call_and_wait` is all most agents need. If you want the manual initiate+poll pattern as well, add `"pine_voice_call"` and `"pine_voice_call_status"` to the list.

**To enable for a specific agent only**, add it under that agent's config in `agents.list`:

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "allow": ["pine_voice_call_and_wait"]
        }
      }
    ]
  }
}
```

> **Note:** If your agent already has a `tools.allow` list with other tools, just append the tool names to the existing array. If you're using `tools.profile` (e.g., `"coding"` or `"messaging"`), adding tools to `tools.allow` will make them available alongside your profile's default tools — the profile won't be overridden.

### Step 2: Restart the gateway

```bash
openclaw gateway restart
```

Your agent now has access to the Pine Voice call tools.

### Step 3: Authenticate with Pine AI

**Option A: Just ask the agent (recommended)**

The easiest way to authenticate is to simply tell your agent:

> "Set up Pine Voice authentication"

The agent will ask for your Pine AI email, send a verification code, ask you for the code, and save the credentials — all conversationally. It uses two built-in tools (`pine_voice_auth_request` and `pine_voice_auth_verify`) that handle the entire flow and write the credentials to `openclaw.json` automatically. After it's done, restart the gateway:

```bash
openclaw gateway restart
```

This also works on first use: if you skip authentication and later ask the agent to make a call, it will detect that credentials are missing and walk you through the same flow.

> **Note:** The verification code arrives by email, so you need to be available to provide it. If the agent tries to make a call while you're away, it will be blocked until you complete verification.

**Option B: Manual CLI setup**

If you prefer to authenticate from the terminal:

```bash
# 1. Request a verification code (sent to your Pine AI account email)
openclaw pine-voice auth setup --email you@example.com

# 2. Check your email for the code, then verify (use the request-token from setup output)
openclaw pine-voice auth verify --email you@example.com --request-token <TOKEN> --code 1234
```

The command prints your access token and user ID. Add them to your plugin config in `openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "openclaw-pine-voice": {
        "config": {
          "access_token": "PASTE_YOUR_TOKEN_HERE",
          "user_id": "PASTE_YOUR_USER_ID_HERE"
        }
      }
    }
  }
}
```

Then restart the gateway:

```bash
openclaw gateway restart
```

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

### Supported countries

The voice agent can only speak English. Calls can be placed to phone numbers in the following countries: US, Canada (+1), UK (+44), Australia (+61), New Zealand (+64), and Ireland (+353). Calls to numbers outside these country codes will be rejected.

### Caller personality

The plugin supports two caller personalities:

- **Negotiator** (`caller: "negotiator"`): For complex negotiations like bill reductions, insurance claims, and formal business matters. **You must provide a thorough negotiation strategy** in the context and instructions — including target outcome, acceptable range, leverage points, fallback positions, and constraints. The negotiator agent thinks things through deliberately and confirms important details multiple times.
- **Communicator** (`caller: "communicator"`): For general-purpose routine tasks like scheduling appointments, making reservations, and inquiries. A specific objective is sufficient — no elaborate strategy needed.

If not specified, the caller defaults to "negotiator".

### Important: Gather all required information first

The voice agent **cannot ask a human for missing information mid-call**. There is no way for the AI to pause and request details during the conversation. Before making a call, make sure you have gathered all information the callee may need, including any authentication, verification, or payment details relevant to the task.

The exact requirements vary depending on the type of call — anticipate what the callee will ask for and include it upfront. If calling customer service or any entity that verifies identity, **you must include sufficient verification information** — the call will fail without it.

## What happens

When using `pine_voice_call_and_wait` (recommended):

1. The tool sends your instructions to Pine's voice agent
2. An SSE connection waits for the final result (with automatic polling fallback)
3. You receive the full transcript (and an optional summary if requested) as soon as the call completes

> **Note:** No real-time intermediate updates are available during the call. You will not receive "call connected" events, partial transcripts, or live conversation updates. The only result is the final transcript delivered after the call ends.

When using `pine_voice_call` + `pine_voice_call_status` (manual):

1. The tool sends your instructions and returns a `call_id` immediately
2. Your agent polls `pine_voice_call_status` every 30 seconds
3. You receive the full transcript once the status reaches a terminal state

> **Note:** While a call is in progress, your agent is waiting for the result. If you need to do other tasks simultaneously, use OpenClaw's sub-agents (`sessions_spawn`) to run the call in a background session.

## Limits and pricing

- Each call costs **50 base credits + 20 credits per minute** of duration
- 5 concurrent calls per user
- Pro subscription required
- MCP voice calls use your existing Pine AI credit balance. All credit sources apply — daily login rewards (300 credits/day), subscription plan credits, and purchased add-ons. Credit policies are governed by the Pine AI app. See [Pine AI Pricing FAQ](https://www.19pine.ai/pricing-faqs) for details.

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| TOKEN_EXPIRED | Access token expired | Ask your agent to re-authenticate, or re-run `openclaw pine-voice auth setup` |
| SUBSCRIPTION_REQUIRED | Not a Pro subscriber | Subscribe at 19pine.ai |
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
openclaw plugins update openclaw-pine-voice
openclaw gateway restart
```

## License

MIT
