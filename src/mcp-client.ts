import type { JSONRPCRequest, JSONRPCResponse, MCPTask, CallResult } from "./types.js";

/**
 * Minimal MCP client for Pine Voice Gateway.
 * Implements just 4 JSON-RPC methods over Streamable HTTP: initialize, tools/call, tasks/get, tasks/result.
 * ~50 lines of protocol-compliant code without a full MCP SDK.
 */
export class PineMCPClient {
  private gatewayUrl: string;
  private accessToken: string;
  private userId: string;
  private sessionId: string | null = null;
  private nextId = 1;

  constructor(gatewayUrl: string, accessToken: string, userId: string) {
    this.gatewayUrl = gatewayUrl.replace(/\/$/, "");
    this.accessToken = accessToken;
    this.userId = userId;
  }

  /** Send a JSON-RPC 2.0 request to the MCP endpoint. */
  private async rpc(method: string, params?: Record<string, unknown>): Promise<JSONRPCResponse> {
    const body: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: this.nextId++,
      method,
      params,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${this.accessToken}`,
      "X-Pine-User-Id": this.userId,
    };
    if (this.sessionId) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }

    const resp = await fetch(`${this.gatewayUrl}/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    // Capture session ID from response
    const sid = resp.headers.get("Mcp-Session-Id");
    if (sid) {
      this.sessionId = sid;
    }

    if (!resp.ok) {
      throw new Error(`MCP HTTP ${resp.status}: ${await resp.text()}`);
    }

    return (await resp.json()) as JSONRPCResponse;
  }

  /** Initialize MCP session. Must be called once before other methods. */
  async initialize(): Promise<void> {
    const resp = await this.rpc("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "openclaw-pine-voice", version: "0.1.0" },
    });

    if (resp.error) {
      throw new Error(`MCP initialize failed: ${resp.error.message}`);
    }

    // Send initialized notification (no response expected)
    await fetch(`${this.gatewayUrl}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
        "X-Pine-User-Id": this.userId,
        "Mcp-Session-Id": this.sessionId || "",
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });
  }

  /** Invoke pine_voice_call tool with async task mode. Returns the created task. */
  async callTool(
    args: Record<string, unknown>,
    ttlMs: number,
  ): Promise<MCPTask> {
    const resp = await this.rpc("tools/call", {
      name: "pine_voice_call",
      arguments: args,
      task: { ttl: ttlMs },
    });

    if (resp.error) {
      throw new Error(resp.error.message);
    }

    const result = resp.result as { task: MCPTask };
    return result.task;
  }

  /** Poll task status. */
  async getTask(taskId: string): Promise<MCPTask> {
    const resp = await this.rpc("tasks/get", { taskId });

    if (resp.error) {
      throw new Error(resp.error.message);
    }

    return resp.result as MCPTask;
  }

  /** Get task result (for completed tasks). */
  async getTaskResult(taskId: string): Promise<CallResult> {
    const resp = await this.rpc("tasks/result", { taskId });

    if (resp.error) {
      throw new Error(resp.error.message);
    }

    const result = resp.result as { structuredContent?: CallResult };
    return result.structuredContent || (resp.result as unknown as CallResult);
  }

  /**
   * Wait for a task to reach a terminal state by polling tasks/get.
   * Respects the server's pollInterval hint.
   */
  async waitForTask(
    taskId: string,
    opts: { pollInterval?: number; maxWaitMs: number },
  ): Promise<MCPTask> {
    const interval = opts.pollInterval || 5000;
    const deadline = Date.now() + opts.maxWaitMs;

    while (Date.now() < deadline) {
      await sleep(interval);

      const task = await this.getTask(taskId);
      if (task.status === "completed" || task.status === "failed" || task.status === "cancelled") {
        return task;
      }
    }

    throw new Error("Call timed out waiting for result");
  }

  /** Update the access token (e.g., after re-authentication). */
  setAccessToken(token: string): void {
    this.accessToken = token;
    this.sessionId = null; // force re-initialize on next call
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
