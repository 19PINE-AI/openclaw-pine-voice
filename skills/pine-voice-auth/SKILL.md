---
name: pine-voice-auth
description: Set up or refresh Pine Voice authentication via the built-in auth tools.
metadata:
  { "openclaw": { "emoji": "🔑" } }
---

# Pine Voice Auth Setup

## When to use

Use this skill when **any** of these are true:

- The user asks to set up Pine Voice, configure Pine AI, or authenticate for voice calls
- A `pine_voice_call` or `pine_voice_call_and_wait` invocation returns "Pine Voice is not authenticated"
- A `pine_voice_call` or `pine_voice_call_and_wait` invocation fails with `TOKEN_EXPIRED`, `UNAUTHORIZED`, or a 401 response
- The user says their Pine Voice token isn't working

Do **not** use this skill for making phone calls — see the `pine-voice` skill for that.

## Prerequisites

- The user must have a **Pine AI account** with a Pro subscription (sign up at https://19pine.ai)

## Important: email verification requires user presence

This auth flow sends a verification code to the user's email inbox. The user **must be available** to check their email and tell you the code. This cannot be automated.

**Recommended timing:** Run this flow right after plugin installation or when the user explicitly asks to set up Pine Voice — not during an unattended or automated workflow.

## Step-by-step instructions

### Step 1: Ask the user for their Pine AI email

Ask: "What email address is your Pine AI account registered with?"

Do not proceed until you have the email.

### Step 2: Send a verification code

Call the `pine_voice_auth_request` tool with the user's email:

```
pine_voice_auth_request({ email: "user@example.com" })
```

This sends a verification code to their email. If the request fails with a 400/422, the email may not be registered — ask the user to check their email or sign up at https://19pine.ai.

### Step 3: Ask the user for the verification code

Tell the user: "I've sent a verification code to your email. Please check your inbox (and spam folder) and tell me the code."

Wait for the user to provide the code. Do not guess or skip this step.

### Step 4: Verify the code and save credentials

Call the `pine_voice_auth_verify` tool with the email and code:

```
pine_voice_auth_verify({ email: "user@example.com", code: "123456" })
```

The tool verifies the code, saves the credentials to `~/.openclaw/openclaw.json`, and automatically adds the voice tools (`pine_voice_call_and_wait`, `pine_voice_call`, `pine_voice_call_status`) to `tools.allow` if they are not already present.

**If verification fails:**
- Invalid code — ask the user to double-check the code and try again (call `pine_voice_auth_verify` with the corrected code).
- Expired token — go back to step 2 to send a new code.

### Step 5: Restart the gateway

Tell the user to restart the gateway for the new credentials to take effect:

"Credentials saved! Please run this command to activate them:"

```
openclaw gateway restart
```

The gateway **must be restarted** after authentication for the new credentials to take effect.

### Step 6: Verify with a test call

After the gateway has restarted, suggest the user make a test call to their own phone number to verify everything works end-to-end:

"Would you like to test it? I can call your phone to confirm everything is working. Just tell me your phone number."

Use the `pine_voice_call_and_wait` tool (or `pine_voice_call` if unavailable) with:
- `to`: the user's phone number
- `callee_name`: the user's name
- `callee_context`: "This is a test call to verify Pine Voice setup."
- `objective`: "Confirm that Pine Voice is set up and working correctly. Say hello, confirm the setup is complete, and say goodbye."

This verifies the token, subscription, and full end-to-end flow.

## Token refresh

Access tokens expire periodically. When a call fails with `TOKEN_EXPIRED` or a 401 error:

1. Inform the user their token has expired and needs to be refreshed
2. Re-run this auth flow starting from step 1

## Troubleshooting

### "Tool pine_voice_call_and_wait not found" after successful auth

Authentication succeeded but the tools are still not visible. This means the tool names were not added to `tools.allow` during verification (e.g., the config was edited manually afterward).

**Fix:** Re-run `pine_voice_auth_verify` which automatically adds the voice tools to `tools.allow`, then restart the gateway. Alternatively, manually add `"pine_voice_call_and_wait"`, `"pine_voice_call"`, and `"pine_voice_call_status"` to the `tools.allow` array in `openclaw.json`.

### Auth request fails with 400/422

The email is likely not registered with Pine AI. Ask the user to verify the email address or sign up at https://19pine.ai.

### "No pending auth request found for this email"

The `pine_voice_auth_verify` tool was called without a prior `pine_voice_auth_request`, or the in-memory request token was lost (e.g., gateway restarted between steps). Go back to step 2 and send a new verification code.

### Code expired

Verification codes expire after a few minutes. If the user took too long, go back to step 2 to send a fresh code.

### Gateway restart required after auth

Credentials are saved to `openclaw.json` but the gateway loads config at startup. The gateway **must be restarted** (`openclaw gateway restart`) for new credentials to take effect. If voice tools fail immediately after auth, remind the user to restart.

## Security notes

- Never log or echo the access token in plaintext beyond what is needed
- The token is stored in a local config file with the same permissions as the user's home directory
- Do not commit config files containing tokens to version control
