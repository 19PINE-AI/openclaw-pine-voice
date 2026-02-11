# Pine AI Voice Call

## When to use
Use `pine_voice_call` when the user wants you to **make a phone call** on their behalf. The Pine AI voice agent will call the specified number, navigate IVR systems, handle verification, conduct negotiations, and carry out the conversation autonomously.

## Best for
- Calling customer service to negotiate bills, request credits, or resolve issues
- Scheduling meetings or appointments by phone
- Making restaurant reservations
- Calling businesses to inquire about services or availability
- Following up with contacts on behalf of the user

## How it works
1. You provide the phone number, callee info, call objective, and detailed strategy
2. Pine's AI voice agent makes the call (typically 1-30 minutes, up to 120 minutes for complex tasks)
3. You receive the full transcript and a summary of the outcome

## Critical: Provide Complete Context Upfront
The voice agent **cannot ask you for more information during the call**. You must include everything the agent might need:

- **Account details**: account numbers, PINs, last 4 of SSN, billing address — anything needed for verification
- **Negotiation strategy**: target price, acceptable range, constraints, leverage points, what offers to reject
- **Background**: why you're calling, what happened previously, relevant dates and amounts
- **Constraints**: what changes are NOT acceptable (e.g., "do not downgrade plan", "do not cancel service")

## Negotiation Calls
For calls involving negotiation (bill reduction, rate matching, fee waiver), provide a **thorough negotiation strategy**, not just a target:

- **Target outcome**: "Reduce monthly bill to $50/mo"
- **Acceptable range**: "Will accept up to $65/mo"
- **Hard constraints**: "Do not change plan tier, do not remove any features"
- **Leverage points**: "Mention 10-year customer loyalty", "Competitor offers $45/mo"
- **Fallback**: "If no reduction, request one-time credit of $100"
- **Walk-away point**: "If nothing offered, ask for retention department"

## Tool parameters
- `to` (required): Phone number in E.164 format (e.g., +14155551234)
- `callee_name` (required): Name of the person or business being called
- `callee_context` (required): Comprehensive context — include ALL info the agent may need during the call
- `objective` (required): Specific goal with negotiation targets and constraints if applicable
- `instructions` (optional): Detailed strategy, approach, and behavioral instructions
- `voice` (optional): "male" or "female"
- `max_duration_minutes` (optional): 1-120, default 30

## Examples

**Simple scheduling:**
"Call John Smith at Acme Corp (+14155551234) to schedule a 30-minute meeting for Tuesday afternoon. Mention that we want to discuss the Q3 partnership proposal."

**Bill negotiation:**
"Call Comcast customer service at +18001234567 to negotiate my internet bill down. Account number: 1234567890, account holder: Jane Doe, current plan: Performance Pro at $89.99/mo. Target: reduce to $60/mo. Acceptable: up to $70/mo. Leverage: I've been a customer for 8 years, competitor AT&T offers $55/mo for similar speed. Do NOT change the plan tier or remove any features. If they won't reduce the monthly rate, ask for a one-time credit of at least $50. Last resort: ask for the retention/loyalty department."
