import { randomUUID } from "node:crypto";
import type {
  ModelProvider,
  ModelCompletionRequest,
  ModelCompletionResult,
  ModelMessage,
  ToolCall,
  ToolDefinition,
} from "./types.js";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

type OpenAiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
};

function toOpenAiTools(tools: ToolDefinition[] | undefined) {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters ?? { type: "object", properties: {} },
    },
  }));
}

function toOpenAiMessages(messages: ModelMessage[]): OpenAiMessage[] {
  const out: OpenAiMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      out.push({ role: "system", content: msg.content });
      continue;
    }
    if (msg.role === "user") {
      out.push({ role: "user", content: msg.content });
      continue;
    }
    if (msg.role === "assistant") {
      if (msg.toolCalls?.length) {
        out.push({
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.toolCalls.map((c) => ({
            id: c.id,
            type: "function",
            function: {
              name: c.name,
              arguments: JSON.stringify(c.arguments ?? {}),
            },
          })),
        });
      } else {
        out.push({ role: "assistant", content: msg.content });
      }
      continue;
    }
    if (msg.role === "tool") {
      out.push({
        role: "tool",
        tool_call_id: msg.toolCallId ?? "unknown",
        content: msg.content,
        name: msg.name,
      });
    }
  }

  if (out.length === 0) {
    out.push({ role: "user", content: "Continue." });
  }

  return out;
}

function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}") as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed };
  } catch {
    return { raw };
  }
}

async function completeOpenAiCompatible(
  request: ModelCompletionRequest,
  options: { providerId: string; defaultBaseUrl: string; envKeyNames: string[] },
): Promise<ModelCompletionResult> {
  const model = (request.config?.model as string | undefined) ?? DEFAULT_MODEL;
  const baseUrl =
    (request.config?.baseUrl as string | undefined) ??
    (request.config?.baseURL as string | undefined) ??
    options.defaultBaseUrl;
  const maxTokens = Number(request.config?.maxTokens ?? 1024);

  let apiKey = request.config?.apiKey as string | undefined;
  if (!apiKey) {
    for (const name of options.envKeyNames) {
      if (process.env[name]) {
        apiKey = process.env[name];
        break;
      }
    }
  }

  if (!apiKey) {
    const { mockProvider } = await import("./mock.js");
    const simulated = await mockProvider.complete(request);
    return {
      ...simulated,
      provider: options.providerId.replace("model/", ""),
      model,
      content: `[${options.providerId}-simulated] Set ${options.envKeyNames.join(" or ")} (or config.apiKey). ${simulated.content}`,
      simulated: true,
    };
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: toOpenAiMessages(request.messages),
  };

  const tools = toOpenAiTools(request.tools);
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI-compatible API error ${response.status}: ${errBody}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{
          id: string;
          function?: { name?: string; arguments?: string };
        }>;
      };
      finish_reason?: string;
    }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  const choice = data.choices?.[0];
  const message = choice?.message;
  const toolCalls: ToolCall[] = [];

  for (const tc of message?.tool_calls ?? []) {
    if (!tc.function?.name) continue;
    toolCalls.push({
      id: tc.id ?? `call_${randomUUID().slice(0, 8)}`,
      name: tc.function.name,
      arguments: parseToolArguments(tc.function.arguments ?? "{}"),
    });
  }

  const input = data.usage?.prompt_tokens ?? 0;
  const output = data.usage?.completion_tokens ?? 0;
  const total = data.usage?.total_tokens ?? input + output;
  const finish = choice?.finish_reason;
  const stopReason =
    finish === "tool_calls" || toolCalls.length > 0
      ? "tool_use"
      : finish === "length"
        ? "max_tokens"
        : "end";

  return {
    provider: options.providerId.replace("model/", ""),
    model,
    content: message?.content ?? (toolCalls.length ? "" : "(empty response)"),
    toolCalls: toolCalls.length ? toolCalls : undefined,
    stopReason,
    usage: { input, output, total },
    simulated: false,
  };
}

/** Official OpenAI API (`OPENAI_API_KEY`). */
export const openaiProvider: ModelProvider = {
  id: "model/openai",
  async complete(request: ModelCompletionRequest): Promise<ModelCompletionResult> {
    return completeOpenAiCompatible(request, {
      providerId: "model/openai",
      defaultBaseUrl: DEFAULT_BASE_URL,
      envKeyNames: ["OPENAI_API_KEY"],
    });
  },
};

/**
 * Any OpenAI-compatible endpoint (Azure, local gateways, Ollama with OpenAI shim).
 * Config: `baseUrl`, `model`, `apiKey` (or `OPENAI_API_KEY` / `OPENAI_COMPAT_API_KEY`).
 */
export const openaiCompatibleProvider: ModelProvider = {
  id: "model/openai-compatible",
  async complete(request: ModelCompletionRequest): Promise<ModelCompletionResult> {
    return completeOpenAiCompatible(request, {
      providerId: "model/openai-compatible",
      defaultBaseUrl:
        (request.config?.baseUrl as string | undefined) ??
        (request.config?.baseURL as string | undefined) ??
        process.env.OPENAI_BASE_URL ??
        DEFAULT_BASE_URL,
      envKeyNames: ["OPENAI_COMPAT_API_KEY", "OPENAI_API_KEY"],
    });
  },
};

const GROK_BASE_URL = "https://api.x.ai/v1";
const GROK_DEFAULT_MODEL = "grok-4";

/**
 * xAI Grok via the OpenAI-compatible Chat Completions API (`XAI_API_KEY` or `GROK_API_KEY`).
 * Config: `model` (default grok-4), `baseUrl`, `apiKey`.
 */
export const grokProvider: ModelProvider = {
  id: "model/grok",
  async complete(request: ModelCompletionRequest): Promise<ModelCompletionResult> {
    const model = (request.config?.model as string | undefined) ?? GROK_DEFAULT_MODEL;
    return completeOpenAiCompatible(
      { ...request, config: { ...request.config, model } },
      {
        providerId: "model/grok",
        defaultBaseUrl:
          (request.config?.baseUrl as string | undefined) ??
          (request.config?.baseURL as string | undefined) ??
          process.env.XAI_BASE_URL ??
          GROK_BASE_URL,
        envKeyNames: ["XAI_API_KEY", "GROK_API_KEY"],
      },
    );
  },
};
