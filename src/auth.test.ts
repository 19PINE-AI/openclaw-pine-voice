import { describe, it, expect } from "vitest";
import { buildAuthConfig } from "./auth.js";

const ALL_VOICE_TOOLS = [
  "pine_voice_call_and_wait",
  "pine_voice_call",
  "pine_voice_call_status",
];

describe("buildAuthConfig", () => {
  const token = "tok_abc";
  const userId = "user_123";

  it("adds credentials to an empty config", () => {
    const { updatedConfig, addedTools } = buildAuthConfig({}, token, userId);

    expect(updatedConfig.plugins.entries["openclaw-pine-voice"].config).toEqual({
      access_token: token,
      user_id: userId,
    });
    expect(addedTools).toEqual(ALL_VOICE_TOOLS);
    expect(updatedConfig.tools.allow).toEqual(ALL_VOICE_TOOLS);
  });

  it("preserves existing config keys", () => {
    const cfg = {
      someOtherKey: "keep me",
      plugins: { entries: { "other-plugin": { enabled: true } } },
      tools: { timeout: 30 },
    };
    const { updatedConfig } = buildAuthConfig(cfg, token, userId);

    expect(updatedConfig.someOtherKey).toBe("keep me");
    expect(updatedConfig.plugins.entries["other-plugin"]).toEqual({ enabled: true });
    expect(updatedConfig.tools.timeout).toBe(30);
  });

  it("merges with existing tools.allow without duplicates", () => {
    const cfg = {
      tools: { allow: ["some_other_tool", "pine_voice_call"] },
    };
    const { updatedConfig, addedTools } = buildAuthConfig(cfg, token, userId);

    expect(addedTools).toEqual(["pine_voice_call_and_wait", "pine_voice_call_status"]);
    expect(updatedConfig.tools.allow).toEqual([
      "some_other_tool",
      "pine_voice_call",
      "pine_voice_call_and_wait",
      "pine_voice_call_status",
    ]);
  });

  it("returns empty addedTools when all voice tools already present", () => {
    const cfg = {
      tools: { allow: [...ALL_VOICE_TOOLS, "extra_tool"] },
    };
    const { updatedConfig, addedTools } = buildAuthConfig(cfg, token, userId);

    expect(addedTools).toEqual([]);
    expect(updatedConfig.tools.allow).toEqual([...ALL_VOICE_TOOLS, "extra_tool"]);
  });

  it("filters out non-string values from existing allow list", () => {
    const cfg = {
      tools: { allow: ["valid_tool", 42, null, undefined, { bad: true }] },
    };
    const { updatedConfig } = buildAuthConfig(cfg, token, userId);

    expect(updatedConfig.tools.allow).toEqual([
      "valid_tool",
      ...ALL_VOICE_TOOLS,
    ]);
  });

  it("handles non-array tools.allow gracefully", () => {
    const cfg = { tools: { allow: "not-an-array" } };
    const { updatedConfig, addedTools } = buildAuthConfig(cfg, token, userId);

    expect(addedTools).toEqual(ALL_VOICE_TOOLS);
    expect(updatedConfig.tools.allow).toEqual(ALL_VOICE_TOOLS);
  });

  it("overwrites previous credentials in existing plugin entry", () => {
    const cfg = {
      plugins: {
        entries: {
          "openclaw-pine-voice": {
            config: { access_token: "old_token", user_id: "old_user", extra: true },
          },
        },
      },
    };
    const { updatedConfig } = buildAuthConfig(cfg, token, userId);
    const pluginConfig = updatedConfig.plugins.entries["openclaw-pine-voice"].config;

    expect(pluginConfig.access_token).toBe(token);
    expect(pluginConfig.user_id).toBe(userId);
    expect(pluginConfig.extra).toBe(true);
  });

  it("handles missing tools key entirely", () => {
    const cfg = { plugins: {} };
    const { updatedConfig, addedTools } = buildAuthConfig(cfg, token, userId);

    expect(addedTools).toEqual(ALL_VOICE_TOOLS);
    expect(updatedConfig.tools.allow).toEqual(ALL_VOICE_TOOLS);
  });
});
