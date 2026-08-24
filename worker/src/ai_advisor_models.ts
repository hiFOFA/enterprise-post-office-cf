export const DEFAULT_CF_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

export const PAID_CF_MODELS = new Set<string>([
    "@cf/moonshotai/kimi-k2.6",
    "@cf/moonshotai/kimi-k2.7-code",
    "@cf/zai-org/glm-5.2",
]);

export type CfTextModel = {
    id: string;
    label: string;
};

const CF_TEXT_MODELS: CfTextModel[] = [
    { id: DEFAULT_CF_MODEL, label: "Llama 3.1 8B Fast" },
    { id: "@cf/meta/llama-3.1-8b-instruct", label: "Llama 3.1 8B" },
    { id: "@cf/meta/llama-3.1-8b-instruct-fp8", label: "Llama 3.1 8B FP8" },
    { id: "@cf/meta/llama-3.2-1b-instruct", label: "Llama 3.2 1B" },
    { id: "@cf/meta/llama-3.2-3b-instruct", label: "Llama 3.2 3B" },
    { id: "@cf/meta/llama-3.2-11b-vision-instruct", label: "Llama 3.2 11B Vision" },
    { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", label: "Llama 3.3 70B Fast" },
    { id: "@cf/meta/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout" },
    { id: "@cf/openai/gpt-oss-20b", label: "GPT-OSS 20B" },
    { id: "@cf/openai/gpt-oss-120b", label: "GPT-OSS 120B" },
    { id: "@cf/zai-org/glm-4.7-flash", label: "GLM 4.7 Flash" },
    { id: "@cf/google/gemma-4-26b-a4b-it", label: "Gemma 4 26B" },
    { id: "@cf/google/gemma-3-12b-it", label: "Gemma 3 12B" },
    { id: "@cf/ibm-granite/granite-4.0-h-micro", label: "Granite 4 Micro" },
    { id: "@cf/qwen/qwen3-30b-a3b-fp8", label: "Qwen3 30B A3B" },
    { id: "@cf/qwen/qwen2.5-coder-32b-instruct", label: "Qwen2.5 Coder 32B" },
    { id: "@cf/mistralai/mistral-small-3.1-24b-instruct", label: "Mistral Small 3.1" },
    { id: "@cf/deepseek-ai/deepseek-v4-flash-0731", label: "DeepSeek V4 Flash" },
    { id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", label: "DeepSeek R1 Distill 32B" },
    { id: "@cf/nvidia/nemotron-3-120b-a12b", label: "Nemotron 3 120B" },
    { id: "@cf/aisingapore/gemma-sea-lion-v4-27b-it", label: "SEA-LION v4 27B" },
    { id: "@cf/google/gemma-7b-it-lora", label: "Gemma 7B LoRA" },
    { id: "@cf/google/gemma-2b-it-lora", label: "Gemma 2B LoRA" },
    { id: "@cf/mistral/mistral-7b-instruct-v0.2-lora", label: "Mistral 7B LoRA" },
    { id: "@cf/meta-llama/llama-2-7b-chat-hf-lora", label: "Llama 2 7B LoRA" },
];

export const listFreeCfTextModels = (): CfTextModel[] => {
    return CF_TEXT_MODELS.filter((model) => !PAID_CF_MODELS.has(model.id));
};

export const listFreeCfModelIds = (): string[] => {
    return listFreeCfTextModels().map((model) => model.id);
};

export const isFreeCfTextModel = (modelId: string): boolean => {
    return listFreeCfModelIds().includes(modelId) && !PAID_CF_MODELS.has(modelId);
};

export const pickDefaultCfModel = (allowedIds: string[]): string => {
    if (allowedIds.includes(DEFAULT_CF_MODEL)) return DEFAULT_CF_MODEL;
    return allowedIds[0] || DEFAULT_CF_MODEL;
};
