---
name: pine-voice-auth
description: Set up or refresh Pine Voice authentication. Obtains an access token via email verification and writes it to the plugin config.
metadata:
  {
    "openclaw":
      { "emoji": "🔑", "requires": { "bins": ["curl", "jq"] } },
  }
---

# Pine Voice Auth Setup

## When to use

Use this skill when **any** of these are true:

- The user asks to set up Pine Voice, configure Pine AI, or authenticate for voice calls
- A `pine_voice_call` invocation returns "Pine Voice is not authenticated yet"
- A `pine_voice_call` invocation fails with `TOKEN_EXPIRED`, `UNAUTHORIZED`, or a 401 response
- The user says their Pine Voice token isn't working

Do **not** use this skill for making phone calls — see the `pine-voice` skill for that.

## Prerequisites

- The user must have a **Pine AI account** with a Pro subscription (sign up at https://pine.ai)
- `curl` and `jq` must be available in the shell

## Important: email verification requires user presence

This auth flow sends a verification code to the user's email inbox. The user **must be available** to check their email and tell you the code. This cannot be automated.

**Recommended timing:** Run this flow right after plugin installation or when the user explicitly asks to set up Pine Voice — not during an unattended or automated workflow.

## Auth flow overview

Pine Voice uses email-based verification. The flow has two API calls with a human step in between:

1. **Request** — send the user's email to get a `request_token`
2. **Wait** — user checks their email for a verification code
3. **Verify** — send email + code + request_token to get a `user_id` and `access_token`
4. **Store** — write both values to the plugin config file
5. **Restart** — restart the gateway to pick up the new config
6. **Test** — make a test call to verify everything works

## Step-by-step instructions

### Step 1: Ask the user for their Pine AI email

Ask: "What email address is your Pine AI account registered with?"

Do not proceed until you have the email.

### Step 2: Request a verification code

Run this command, replacing `USER_EMAIL` with the email from step 1:

```bash
curl -s -X POST https://www.19pine.ai/api/v2/auth/email/request \
  -H "Content-Type: application/json" \
  -d '{"email": "USER_EMAIL"}' | jq .
```

**Expected response:**

```json
{"status": "success", "data": {"request_token": "abc123..."}}
```

Save the `request_token` value — you need it in step 4.

**If the request fails:**
- `400` or `422` — the email may not be registered. Ask the user to check their email or sign up at https://pine.ai.
- Network error — check connectivity and retry.

### Step 3: Ask the user for the verification code

Tell the user: "I've sent a verification code to your email. Please check your inbox (and spam folder) and tell me the code."

Wait for the user to provide the code. Do not guess or skip this step.

### Step 4: Verify the code and obtain the access token

Run this command, replacing `USER_EMAIL`, `THE_CODE`, and `THE_REQUEST_TOKEN` with the actual values:

```bash
curl -s -X POST https://www.19pine.ai/api/v2/auth/email/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "USER_EMAIL", "code": "THE_CODE", "request_token": "THE_REQUEST_TOKEN"}' | jq .
```

**Expected response:**

```json
{"id": "1234567890", "access_token": "eyJ...", ...}
```

Save **both** values:
- **`id`** — the user's Pine user ID
- **`access_token`** — the access token

**If verification fails:**
- `401` or `400` with "invalid code" — ask the user to double-check the code and try again.
- `410` or "expired" — the request_token expired. Go back to step 2 to start over.

### Step 5: Store the credentials

Read the existing `~/.openclaw/openclaw.json` (or the config file at `$OPENCLAW_CONFIG_PATH`), then set both `plugins.entries.pine-voice.config.user_id` and `plugins.entries.pine-voice.config.access_token`. If the `pine-voice` entry doesn't exist, create it:

```json
{
  "plugins": {
    "entries": {
      "pine-voice": {
        "enabled": true,
        "config": {
          "user_id": "THE_USER_ID",
          "access_token": "THE_ACCESS_TOKEN"
        }
      }
    }
  }
}
```

### Step 6: Restart the gateway

After updating the config, restart the gateway:

```bash
openclaw gateway restart
```

### Step 7: Verify with a test call

After authentication is complete, suggest the user make a test call to their own phone number to verify everything works end-to-end:

"Would you like to test it? I can call your phone to confirm everything is working. Just tell me your phone number."

Use the `pine_voice_call` tool with:
- `to`: the user's phone number
- `callee_name`: the user's name
- `callee_context`: "This is a test call to verify Pine Voice setup."
- `objective`: "Confirm that Pine Voice is set up and working correctly. Say hello, confirm the setup is complete, and say goodbye."

This verifies the token, subscription, and full end-to-end flow.

## Token refresh

Access tokens expire periodically. When a call fails with `TOKEN_EXPIRED` or a 401 error:

1. Inform the user their token has expired and needs to be refreshed
2. Re-run this auth flow starting from step 1

## Security notes

- Never log or echo the access token in plaintext beyond what is needed to write the config file
- The token is stored in a local config file with the same permissions as the user's home directory
- Do not commit config files containing tokens to version control
