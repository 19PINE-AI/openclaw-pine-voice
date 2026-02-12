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

## How it works
1. **Gather all required information first** — ask the user for any authentication, verification, or payment details the callee may need (see below)
2. You provide the phone number, callee info, call objective, and detailed strategy
3. Pine's AI voice agent makes the call
4. You receive the full transcript and a summary of the outcome

## Critical: Gather All Required Information BEFORE Calling
The voice agent **cannot ask a human for missing information during the call**. There is no way for the AI agent to pause and request details mid-conversation. You **must ask the user** for all information the callee might need **before** invoking this tool.

Anticipate what the callee will require based on the type of call. This may include authentication or verification details, payment information, negotiation targets and constraints, relevant background, or any other context specific to the task. The exact requirements vary — use your judgment to determine what the callee is likely to need.

If the user hasn't provided sufficient information for the callee to process the request (e.g., a customer service call with no verification details), **ask the user for this information before proceeding**. Do not invoke the tool hoping it will work without it.

## Negotiation Calls
For calls involving negotiation (bill reduction, rate matching, fee waiver), provide a **thorough negotiation strategy**, not just a target:

- **Target outcome**: "Reduce monthly bill to $50/mo"
- **Acceptable range**: "Will accept up to $65/mo"
- **Hard constraints**: "Do not change plan tier, do not remove any features"
- **Leverage points**: "Mention 10-year customer loyalty", "Competitor offers $45/mo"
- **Fallback**: "If no reduction, request one-time credit of $100"
- **Walk-away point**: "If nothing offered, ask for retention department"

## Tool parameters
- `to` (required): Phone number in E.164 format (e.g., +14155551234). Must be a number in an English-speaking country.
- `callee_name` (required): Name of the person or business being called
- `callee_context` (required): Comprehensive context — include all authentication, verification, and payment info the agent may need during the call
- `objective` (required): Specific goal with negotiation targets and constraints if applicable
- `instructions` (optional): Detailed strategy, approach, and behavioral instructions
- `voice` (optional): "male" or "female"
- `max_duration_minutes` (optional): 1-120, default 120

## Examples

**Simple scheduling:**
"Call John Smith at Acme Corp (+14155551234) to schedule a 30-minute meeting for Tuesday afternoon. Mention that we want to discuss the Q3 partnership proposal."

**Bill negotiation:**
"Call Comcast customer service at +18001234567 to negotiate my internet bill down. Account number: 1234567890, account holder: Jane Doe, current plan: Performance Pro at $89.99/mo. Target: reduce to $60/mo. Acceptable: up to $70/mo. Leverage: I've been a customer for 8 years, competitor AT&T offers $55/mo for similar speed. Do NOT change the plan tier or remove any features. If they won't reduce the monthly rate, ask for a one-time credit of at least $50. Last resort: ask for the retention/loyalty department."
