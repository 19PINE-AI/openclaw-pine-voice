# Pine AI Voice Call

## When to use
Use `pine_voice_call_and_wait` (preferred) or `pine_voice_call` when the user wants you to **make a phone call** on their behalf. The Pine AI voice agent will call the specified number, navigate IVR systems, handle verification, conduct negotiations, and carry out the conversation autonomously.

**Important:** The voice agent can only speak English. Calls can be placed to the US, Canada, Puerto Rico (+1), UK (+44), Australia (+61), New Zealand (+64), Singapore (+65), Ireland (+353), and Hong Kong (+852). Do not use this tool for calls to numbers outside these countries.

## Best for
- Calling customer service to negotiate bills, request credits, or resolve issues
- Scheduling meetings or appointments by phone
- Making restaurant reservations
- Calling businesses to inquire about services or availability
- Following up with contacts on behalf of the user

## How to make a call

**IMPORTANT: Phone calls are long-running (5-120 minutes). ALWAYS use `sessions_spawn` to run the call in a background sub-agent so you remain available to the user.**

### Step 1: Gather all required information

Before initiating a call, you **must** ask the user for every piece of information the callee might need. The voice agent **cannot ask a human for missing information during the call**. There is no way for the AI agent to pause and request details mid-conversation.

Anticipate what the callee will require based on the type of call. This may include authentication or verification details, payment information, negotiation targets and constraints, relevant background, or any other context specific to the task.

If the user hasn't provided sufficient information for the callee to process the request (e.g., a customer service call with no verification details), **ask the user for this information before proceeding**. Do not invoke the tool hoping it will work without it.

### Step 2: Spawn a background sub-agent

Use `sessions_spawn` to run the call in the background.

**Preferred approach — `pine_voice_call_and_wait` (single tool, blocks until done):**

- **tool**: `sessions_spawn`
- **task**: Write a clear task that includes ALL call parameters. Example:

  > Make a phone call using the pine_voice_call_and_wait tool. Call details: Call the restaurant at +14155559876. Callee name: The Italian Place. Callee context: Italian restaurant on Main Street. Making a dinner reservation. Objective: Make a reservation for 4 people tonight at 7pm. Instructions: If 7pm is not available, try 7:30 or 8pm. Prefer a booth if possible. Name for the reservation: Jane Doe. When the call completes, report the full summary, transcript, and outcome.

- **label**: Short description, e.g. `call-restaurant-reservation`
- **runTimeoutSeconds**: `(max_duration_minutes + 5) * 60` — give extra buffer beyond the call's max duration

**Alternative approach — `pine_voice_call` + `pine_voice_call_status` (manual polling):**

If `pine_voice_call_and_wait` is not available, use `pine_voice_call` to initiate, then poll `pine_voice_call_status` every 30 seconds. Include polling instructions in the task description.

### Step 3: Tell the user the call is active

After spawning, tell the user that **the call is already active** — Pine's voice agent has dialed the number and is handling the conversation in the background. The call is NOT "connecting" or "being set up". Example:
> "The call is now active — Pine's voice agent is on the line with [callee] handling the conversation in the background. This typically takes a few minutes. I'll let you know the results when it's done. Feel free to ask me anything else in the meantime."

### Step 4: Evaluate the transcript and summarize the result

When the sub-agent announces the result, you MUST read the full transcript carefully to determine the actual outcome. **Do NOT rely on the `status` field** — a status like `HungupByPeer` only means the other party hung up, not that the call succeeded.

**How to evaluate the transcript:**

Read what the OTHER party (not Pine's agent) actually said. The callee's responses are the only way to know if the objective was achieved.

**Treat the call as a FAILURE if:**
- Only Pine's agent speaks and the other side is silent or gives no meaningful response
- The other party's responses are automated/recorded messages (e.g. voicemail greetings, "leave a message after the beep", "your call cannot be completed as dialed")
- System messages report extended silence from both sides (e.g. "silence from both sides for 25 seconds")
- The callee hung up before the objective could be discussed
- The callee never acknowledged or responded to the request

These patterns mean the call reached voicemail, an automated system, or the callee was unavailable. Report this honestly to the user.

**Summarize for the user:**
- Whether the objective was actually achieved (based on the transcript, not the status)
- If it failed: why (voicemail, no answer, hung up, etc.) and suggest a retry or alternative
- Key details from what the callee actually said
- Any follow-up actions needed
- Credits charged

## Tools

### pine_voice_call_and_wait (preferred — initiate + wait)
Initiates a phone call and blocks until it completes, returning the full result in a single tool call. Uses SSE to wait for the final result with automatic fallback to polling. No manual polling needed.

**Important:** No real-time intermediate updates are available. You will NOT receive "call connected" events, partial transcripts, or live conversation progress. The only result is the final complete transcript delivered after the call ends.

Parameters:

- `to` (required): Phone number in E.164 format (e.g., +14155551234). Must be in a supported country: US/CA/PR (+1), UK (+44), AU (+61), NZ (+64), SG (+65), IE (+353), HK (+852).
- `callee_name` (required): Name of the person or business being called
- `callee_context` (required): Comprehensive context — include all authentication, verification, and payment info the agent may need during the call
- `objective` (required): Specific goal with negotiation targets and constraints if applicable
- `instructions` (optional): Detailed strategy, approach, and behavioral instructions
- `caller` (optional): "negotiator" or "communicator", default "negotiator". Negotiator requires a thorough negotiation strategy in context/instructions (target outcome, acceptable range, leverage points, fallback positions). Communicator is for general-purpose routine tasks.
- `voice` (optional): "male" or "female", default "female"
- `max_duration_minutes` (optional): 1-120, default 120
- `enable_summary` (optional): boolean, default false. Request an LLM-generated summary after the call. Most AI agents can process the full transcript directly, so the summary is opt-in.

### pine_voice_call (initiate)
Initiates a phone call and returns immediately with a `call_id`. At this point, the call is ALREADY ACTIVE — the voice agent has dialed and is on the line. Same parameters as `pine_voice_call_and_wait`. Use with `pine_voice_call_status` to poll for results.

### pine_voice_call_status (poll)
Checks call progress using the `call_id` from pine_voice_call. Poll every 30 seconds until a transcript is present in the response. When the status is `in_progress`, the voice agent is ACTIVELY on the call speaking with the callee — it is NOT connecting or waiting. Returns the full transcript and billing info when complete (plus summary if `enable_summary` was set to true).

**CRITICAL:** When you receive the final result, do NOT assume the call succeeded just because the status says "completed" or "HungupByPeer". You MUST read the full transcript. If the other party never responded meaningfully (voicemail, silence, automated messages), the call failed.

- `call_id` (required): The call_id returned by pine_voice_call

**Note:** No real-time intermediate updates are available. The `phase` and `partial_transcript` fields are defined in the schema but are NOT currently populated. You will not receive "call connected" events or live transcript turns. The only way to get the transcript is to wait for the call to complete. Simply poll until the status is terminal and the full transcript is present.

## Negotiation calls
For calls involving negotiation (bill reduction, rate matching, fee waiver), provide a **thorough negotiation strategy**, not just a target:

- **Target outcome**: "Reduce monthly bill to $50/mo"
- **Acceptable range**: "Will accept up to $65/mo"
- **Hard constraints**: "Do not change plan tier, do not remove any features"
- **Leverage points**: "Mention 10-year customer loyalty", "Competitor offers $45/mo"
- **Fallback**: "If no reduction, request one-time credit of $100"
- **Walk-away point**: "If nothing offered, ask for retention department"

## Examples

**Test call to yourself:**
"Call my phone at +1XXXXXXXXXX. Tell me that Pine Voice is set up and working. Confirm the setup is complete and say goodbye."

**Restaurant reservation:**
"Call the restaurant at +14155559876 and make a reservation for 4 people tonight at 7pm. If 7pm is not available, try 7:30 or 8pm. Name for the reservation: Jane Doe."

## Troubleshooting

### "Tool pine_voice_call_and_wait not found"

The voice tools (`pine_voice_call_and_wait`, `pine_voice_call`, `pine_voice_call_status`) are registered as **optional** tools. They are only available to the AI agent if they are explicitly listed in the `tools.allow` configuration.

**Cause:** The tool names are missing from `tools.allow` in `openclaw.json`.

**Fix:** Add the voice tools to `tools.allow` in `openclaw.json`. Any of these approaches work:

1. **Re-run authentication** — the `pine_voice_auth_verify` tool automatically adds all voice tools to `tools.allow`. Use the `pine-voice-auth` skill to re-authenticate, then restart the gateway.

2. **Add tools manually** — edit `openclaw.json` and add the tool names to `tools.allow`:
   ```json
   { "tools": { "allow": ["pine_voice_call_and_wait", "pine_voice_call", "pine_voice_call_status"] } }
   ```

After editing the config, restart the gateway: `openclaw gateway restart`.

### "Pine Voice is not authenticated"

The plugin has no saved credentials. Run the auth flow using the `pine-voice-auth` skill.

### "Pine Voice authentication has expired"

The access token has expired. Re-run the auth flow using the `pine-voice-auth` skill to get a fresh token.

### "TOKEN_EXPIRED" or 401 errors during a call

The token was valid at auth time but has since expired. Re-authenticate using the `pine-voice-auth` skill and restart the gateway.

### "SUBSCRIPTION_REQUIRED: Pine AI Pro subscription required"

The user's Pine AI account does not have an active Pro subscription, or the subscription has expired/been cancelled. The user must subscribe or renew at https://19pine.ai.

### "INSUFFICIENT_CREDITS: At least N credits required"

The user's credit balance is too low to initiate a call. Each call requires a minimum of 50 credits (base charge). The user must add credits at https://19pine.ai.

### "RATE_LIMITED: You've already called this number N times today"

The voice gateway enforces a per-target daily call limit. The user has called the same phone number too many times in one day. Wait until the next day or call a different number.

### "RATE_LIMITED: Maximum N concurrent calls exceeded"

The user has too many active calls running simultaneously (default limit: 5). Wait for an active call to finish before starting a new one.

### "POLICY_VIOLATION" or safety review rejection

The gateway's safety review rejected the call request. Common reasons:
- Objective is too vague (e.g., "just call them")
- Target number is in an unsupported country
- Negotiator caller type used without a complete negotiation strategy
- Number is on the emergency or premium-rate blocklist

Read the error message for specifics and adjust the call parameters accordingly.

### "PHONE_REQUIRED"

The user has not registered a phone number in their Pine AI account. They need to add one in their account settings at https://www.19pine.ai.

## HTTP API reference

The plugin uses these REST endpoints on the Pine Voice gateway (for transparency — the tools handle this automatically):

- **POST /api/v2/voice/call** — Initiate a call. Returns `{ "call_id": "...", "status": "in_progress" }`.
- **GET /api/v2/voice/call/{call_id}** — Poll call status. Returns full transcript and billing info when complete (plus summary if requested).
- **GET /api/v2/voice/call/{call_id}/stream** — SSE stream that waits for the final call result. Used by `pine_voice_call_and_wait` under the hood. No intermediate events are delivered; only the final transcript after call completion.

Auth: `Authorization: Bearer <token>` + `X-Pine-User-Id: <user_id>` headers.
