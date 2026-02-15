# Pine AI Voice Call

## When to use
Use `pine_voice_call` when the user wants you to **make a phone call** on their behalf. The Pine AI voice agent will call the specified number, navigate IVR systems, handle verification, conduct negotiations, and carry out the conversation autonomously.

**Important:** The voice agent can only speak English. Calls can only be delivered to English-speaking countries and recipients who understand English. Do not use this tool for calls to non-English-speaking countries or recipients.

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

Use `sessions_spawn` to run the call in the background:

- **tool**: `sessions_spawn`
- **task**: Write a clear task that includes ALL call parameters and polling instructions. Example:

  > Make a phone call using the pine_voice_call tool, then poll pine_voice_call_status every 30 seconds until it completes. Call details: Call Comcast customer service at +18001234567. Callee name: Comcast Support. Callee context: Account holder Jane Doe, account #1234567890, current plan Performance Pro at $89.99/mo, 8-year customer. Objective: Negotiate monthly bill down to $60/mo, acceptable up to $70/mo. Do NOT change plan tier or remove features. If no monthly reduction, ask for one-time credit of $50. Last resort: ask for retention department. Instructions: Mention 8-year loyalty and that AT&T offers $55/mo for similar speed. When the call completes, report the full summary, transcript, and outcome.

- **label**: Short description, e.g. `call-comcast-bill-negotiation`
- **runTimeoutSeconds**: `(max_duration_minutes + 5) * 60` — give extra buffer beyond the call's max duration

### Step 3: Tell the user the call has started

After spawning, tell the user something like:
> "I've started the call to Comcast in the background. I'll let you know the results when it's done. Feel free to ask me anything else in the meantime."

### Step 4: Summarize the result

When the sub-agent announces the result, summarize the transcript and outcome for the user. Include:
- Whether the objective was achieved
- Key details from the conversation
- Any follow-up actions needed
- Credits charged

## Tools

### pine_voice_call (initiate)
Initiates a phone call and returns immediately with a `call_id`. Parameters:

- `to` (required): Phone number in E.164 format (e.g., +14155551234). Must be a number in an English-speaking country.
- `callee_name` (required): Name of the person or business being called
- `callee_context` (required): Comprehensive context — include all authentication, verification, and payment info the agent may need during the call
- `objective` (required): Specific goal with negotiation targets and constraints if applicable
- `instructions` (optional): Detailed strategy, approach, and behavioral instructions
- `caller` (optional): "negotiator" or "communicator". Negotiator requires a thorough negotiation strategy in context/instructions (target outcome, acceptable range, leverage points, fallback positions). Communicator is for general-purpose routine tasks.
- `voice` (optional): "male" or "female"
- `max_duration_minutes` (optional): 1-120, default 120

### pine_voice_call_status (poll)
Checks call progress using the `call_id` from pine_voice_call. Poll every 30 seconds until the status is terminal (`completed`, `failed`, or `cancelled`). Returns full transcript, summary, and billing info when complete.

- `call_id` (required): The call_id returned by pine_voice_call

## Negotiation calls
For calls involving negotiation (bill reduction, rate matching, fee waiver), provide a **thorough negotiation strategy**, not just a target:

- **Target outcome**: "Reduce monthly bill to $50/mo"
- **Acceptable range**: "Will accept up to $65/mo"
- **Hard constraints**: "Do not change plan tier, do not remove any features"
- **Leverage points**: "Mention 10-year customer loyalty", "Competitor offers $45/mo"
- **Fallback**: "If no reduction, request one-time credit of $100"
- **Walk-away point**: "If nothing offered, ask for retention department"

## Examples

**Simple scheduling:**
"Call John Smith at Acme Corp (+14155551234) to schedule a 30-minute meeting for Tuesday afternoon. Mention that we want to discuss the Q3 partnership proposal."

**Bill negotiation:**
"Call Comcast customer service at +18001234567 to negotiate my internet bill down. Account number: 1234567890, account holder: Jane Doe, current plan: Performance Pro at $89.99/mo. Target: reduce to $60/mo. Acceptable: up to $70/mo. Leverage: I've been a customer for 8 years, competitor AT&T offers $55/mo for similar speed. Do NOT change the plan tier or remove any features. If they won't reduce the monthly rate, ask for a one-time credit of at least $50. Last resort: ask for the retention/loyalty department."

## HTTP API reference

The plugin uses these REST endpoints on the Pine Voice gateway (for transparency — the tools handle this automatically):

- **POST /api/v2/voice/call** — Initiate a call. Returns `{ "call_id": "...", "status": "in_progress" }`.
- **GET /api/v2/voice/call/{call_id}** — Poll call status. Returns full transcript, summary, and billing info when complete.

Auth: `Authorization: Bearer <token>` + `X-Pine-User-Id: <user_id>` headers.
