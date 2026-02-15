# Pine AI Voice Call

## When to use
Use `pine_voice_call_and_wait` (preferred) or `pine_voice_call` when the user wants you to **make a phone call** on their behalf. The Pine AI voice agent will call the specified number, navigate IVR systems, handle verification, conduct negotiations, and carry out the conversation autonomously.

**Important:** The voice agent can only speak English. Calls can be placed to the US, Canada (+1), UK (+44), Australia (+61), New Zealand (+64), and Ireland (+353). Do not use this tool for calls to numbers outside these countries.

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

### Step 4: Summarize the result

When the sub-agent announces the result, summarize the transcript and outcome for the user. Include:
- Whether the objective was achieved
- Key details from the conversation
- Any follow-up actions needed
- Credits charged

## Tools

### pine_voice_call_and_wait (preferred — initiate + wait)
Initiates a phone call and blocks until it completes, returning the full result in a single tool call. Uses SSE streaming for real-time delivery with automatic fallback to polling. No manual polling needed. Parameters:

- `to` (required): Phone number in E.164 format (e.g., +14155551234). Must be in a supported country: US/CA (+1), UK (+44), AU (+61), NZ (+64), IE (+353).
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
Checks call progress using the `call_id` from pine_voice_call. Poll every 30 seconds until the status is terminal (`completed`, `failed`, or `cancelled`). When the status is `in_progress`, the voice agent is ACTIVELY on the call speaking with the callee — it is NOT connecting or waiting. Returns the current phase and partial transcript while in progress, and full transcript and billing info when complete (plus summary if `enable_summary` was set to true).

- `call_id` (required): The call_id returned by pine_voice_call

**Real-time progress:** When the call is in progress, the status response now includes:
- `phase`: "initiated" (dialing) or "connected" (callee answered, conversation active)
- `partial_transcript`: Live transcript turns as the conversation progresses

When the phase shows "connected", tell the user: "The callee has answered. Pine's voice agent is now in conversation." If partial transcript turns are available, you can share key points with the user.

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

## HTTP API reference

The plugin uses these REST endpoints on the Pine Voice gateway (for transparency — the tools handle this automatically):

- **POST /api/v2/voice/call** — Initiate a call. Returns `{ "call_id": "...", "status": "in_progress" }`.
- **GET /api/v2/voice/call/{call_id}** — Poll call status. Returns full transcript and billing info when complete (plus summary if requested).
- **GET /api/v2/voice/call/{call_id}/stream** — SSE stream for real-time status and result delivery. Used by `pine_voice_call_and_wait` under the hood.

Auth: `Authorization: Bearer <token>` + `X-Pine-User-Id: <user_id>` headers.
