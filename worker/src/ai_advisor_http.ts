export type AdvisorProviderKind = "cf" | "openai" | "claude";

export type ProviderRunResult = {
    ok: boolean;
    status: number;
    output: string;
    error: string;
    first_token_ms: number | null;
    total_ms: number;
};

const TEST_TIMEOUT_MS = 30_000;

const isIpv4 = (host: string): boolean => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);

const ipv4Blocked = (host: string): boolean => {
    const parts = host.split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
        return true;
    }
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127 || a === 255) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
};

export const assertPublicHttpsUrl = (raw: string): URL => {
    const trimmed = (raw || "").trim();
    if (!trimmed || trimmed.length > 2048) {
        throw new Error("invalid url");
    }
    let url: URL;
    try {
        url = new URL(trimmed);
    } catch {
        throw new Error("invalid url");
    }
    if (url.protocol !== "https:") {
        throw new Error("invalid url");
    }
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (
        host === "localhost"
        || host === "127.0.0.1"
        || host === "::1"
        || host.endsWith(".localhost")
        || host.endsWith(".local")
        || host.endsWith(".internal")
        || host.endsWith(".arpa")
    ) {
        throw new Error("invalid url");
    }
    if (isIpv4(host) && ipv4Blocked(host)) {
        throw new Error("invalid url");
    }
    if (host.includes(":") && (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80"))) {
        throw new Error("invalid url");
    }
    return url;
};

export const joinUrl = (base: string, suffix: string): string => {
    const normalized = base.replace(/\/+$/, "");
    if (normalized.endsWith(suffix)) return normalized;
    return `${normalized}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
};

export const openaiChatCompletionsUrl = (baseUrl: string): string => {
    const url = assertPublicHttpsUrl(baseUrl);
    const href = url.href.replace(/\/+$/, "");
    if (href.endsWith("/chat/completions")) return href;
    return joinUrl(href, "/chat/completions");
};

export const claudeMessagesUrl = (baseUrl: string): string => {
    const url = assertPublicHttpsUrl(baseUrl);
    const href = url.href.replace(/\/+$/, "");
    if (href.endsWith("/messages")) return href;
    if (href.endsWith("/v1")) return `${href}/messages`;
    return joinUrl(href, "/v1/messages");
};

const parseSseDataLines = (chunk: string): string[] => {
    const lines: string[] = [];
    for (const line of chunk.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data && data !== "[DONE]") lines.push(data);
    }
    return lines;
};

const openaiDeltaText = (payload: string): string => {
    try {
        const parsed = JSON.parse(payload) as {
            choices?: { delta?: { content?: string }; message?: { content?: string } }[];
        };
        return parsed.choices?.[0]?.delta?.content
            || parsed.choices?.[0]?.message?.content
            || "";
    } catch {
        return "";
    }
};

const claudeDeltaText = (payload: string): string => {
    try {
        const parsed = JSON.parse(payload) as {
            type?: string;
            delta?: { text?: string; type?: string };
            completion?: string;
        };
        if (typeof parsed.delta?.text === "string") return parsed.delta.text;
        if (typeof parsed.completion === "string") return parsed.completion;
        return "";
    } catch {
        return "";
    }
};

const cfDeltaText = (payload: string): string => {
    try {
        const parsed = JSON.parse(payload) as { response?: unknown };
        return typeof parsed.response === "string" ? parsed.response : "";
    } catch {
        return "";
    }
};

const readStreamText = async (
    stream: ReadableStream<Uint8Array>,
    extract: (payload: string) => string,
    onFirst: () => void
): Promise<string> => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let output = "";
    let sawFirst = false;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop() || "";
        for (const part of parts) {
            for (const data of parseSseDataLines(part)) {
                const piece = extract(data);
                if (!piece) continue;
                if (!sawFirst) {
                    sawFirst = true;
                    onFirst();
                }
                output += piece;
            }
        }
    }
    if (buffer.trim()) {
        for (const data of parseSseDataLines(buffer)) {
            const piece = extract(data);
            if (!piece) continue;
            if (!sawFirst) {
                sawFirst = true;
                onFirst();
            }
            output += piece;
        }
    }
    return output;
};

const withTimeout = async <T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
    try {
        return await work(controller.signal);
    } finally {
        clearTimeout(timer);
    }
};

const failResult = (
    started: number,
    firstTokenAt: number | null,
    status: number,
    error: string
): ProviderRunResult => ({
    ok: false,
    status,
    output: "",
    error,
    first_token_ms: firstTokenAt == null ? null : Math.max(0, firstTokenAt - started),
    total_ms: Math.max(0, Date.now() - started),
});

const okResult = (
    started: number,
    firstTokenAt: number | null,
    status: number,
    output: string
): ProviderRunResult => ({
    ok: true,
    status,
    output,
    error: "",
    first_token_ms: firstTokenAt == null ? Math.max(0, Date.now() - started) : Math.max(0, firstTokenAt - started),
    total_ms: Math.max(0, Date.now() - started),
});

const responseErrorText = async (response: Response): Promise<string> => {
    const text = await response.text().catch(() => "");
    return text || response.statusText || `HTTP ${response.status}`;
};

export const runOpenAiCompatible = async (options: {
    baseUrl: string;
    model: string;
    apiKey: string;
    messages: { role: string; content: string }[];
    stream?: boolean;
}): Promise<ProviderRunResult> => {
    const started = Date.now();
    let firstTokenAt: number | null = null;
    let url: string;
    try {
        url = openaiChatCompletionsUrl(options.baseUrl);
    } catch {
        return failResult(started, null, 400, "invalid url");
    }
    try {
        const response = await withTimeout((signal) => fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${options.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: options.model,
                messages: options.messages,
                stream: options.stream !== false,
                max_tokens: 256,
            }),
            signal,
        }));
        if (!response.ok) {
            return failResult(started, null, response.status, await responseErrorText(response));
        }
        if (options.stream !== false && response.body) {
            const output = await readStreamText(response.body, openaiDeltaText, () => {
                if (firstTokenAt == null) firstTokenAt = Date.now();
            });
            return okResult(started, firstTokenAt, response.status, output.trim());
        }
        const data = await response.json() as {
            choices?: { message?: { content?: string } }[];
        };
        const output = data.choices?.[0]?.message?.content || "";
        return okResult(started, Date.now(), response.status, String(output).trim());
    } catch (error) {
        const message = error instanceof Error ? error.message : "request failed";
        return failResult(started, firstTokenAt, 500, message);
    }
};

export const runClaudeCompatible = async (options: {
    baseUrl: string;
    model: string;
    apiKey: string;
    messages: { role: string; content: string }[];
    stream?: boolean;
}): Promise<ProviderRunResult> => {
    const started = Date.now();
    let firstTokenAt: number | null = null;
    let url: string;
    try {
        url = claudeMessagesUrl(options.baseUrl);
    } catch {
        return failResult(started, null, 400, "invalid url");
    }
    const system = options.messages
        .filter((row) => row.role === "system")
        .map((row) => row.content)
        .join("\n\n");
    const claudeMessages = options.messages
        .filter((row) => row.role === "user" || row.role === "assistant")
        .map((row) => ({ role: row.role, content: row.content }));
    try {
        const response = await withTimeout((signal) => fetch(url, {
            method: "POST",
            headers: {
                "x-api-key": options.apiKey,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: options.model,
                max_tokens: 256,
                stream: options.stream !== false,
                ...(system ? { system } : {}),
                messages: claudeMessages.length ? claudeMessages : [{ role: "user", content: "hi" }],
            }),
            signal,
        }));
        if (!response.ok) {
            return failResult(started, null, response.status, await responseErrorText(response));
        }
        if (options.stream !== false && response.body) {
            const output = await readStreamText(response.body, claudeDeltaText, () => {
                if (firstTokenAt == null) firstTokenAt = Date.now();
            });
            return okResult(started, firstTokenAt, response.status, output.trim());
        }
        const data = await response.json() as {
            content?: { type?: string; text?: string }[];
        };
        const output = (data.content || [])
            .filter((part) => part.type === "text" || typeof part.text === "string")
            .map((part) => part.text || "")
            .join("");
        return okResult(started, Date.now(), response.status, output.trim());
    } catch (error) {
        const message = error instanceof Error ? error.message : "request failed";
        return failResult(started, firstTokenAt, 500, message);
    }
};

const cfResponseText = (result: unknown): string => {
    if (typeof result === "string") return result.trim();
    if (result && typeof result === "object") {
        const row = result as { response?: unknown };
        if (typeof row.response === "string") return row.response.trim();
        if (row.response && typeof row.response === "object" && "response" in (row.response as object)) {
            return String((row.response as { response: unknown }).response || "").trim();
        }
    }
    return result == null ? "" : JSON.stringify(result);
};

export const runWorkersAi = async (
    env: Bindings,
    model: string,
    messages: { role: string; content: string }[]
): Promise<ProviderRunResult> => {
    const started = Date.now();
    let firstTokenAt: number | null = null;
    if (!env.AI || typeof env.AI.run !== "function") {
        return failResult(started, null, 503, "AI binding missing");
    }
    try {
        const streamed = await env.AI.run(model as keyof AiModels, {
            messages,
            stream: true,
        });
        if (streamed && typeof streamed === "object" && "getReader" in (streamed as object)) {
            const output = await readStreamText(
                streamed as ReadableStream<Uint8Array>,
                cfDeltaText,
                () => {
                    if (firstTokenAt == null) firstTokenAt = Date.now();
                }
            );
            if (output.trim()) {
                return okResult(started, firstTokenAt, 200, output.trim());
            }
        }
        const result = await env.AI.run(model as keyof AiModels, {
            messages,
            stream: false,
        });
        return okResult(started, Date.now(), 200, cfResponseText(result));
    } catch (error) {
        const message = error instanceof Error ? error.message : "request failed";
        return failResult(started, firstTokenAt, 500, message);
    }
};

export const defaultBaseUrl = (provider: AdvisorProviderKind): string => {
    if (provider === "claude") return "https://api.anthropic.com";
    if (provider === "openai") return "https://api.openai.com/v1";
    return "";
};
