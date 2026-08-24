import { isFreeCfTextModel, listFreeCfModelIds, pickDefaultCfModel } from "./ai_advisor_models";

export type AdvisorActorRef = {
    type: "main" | "sub" | "user";
    id: string;
};

export type RoleCfAccess = {
    enableCf: boolean;
    models: string[];
};

export type AdvisorPolicy = {
    user: RoleCfAccess;
    subDefault: RoleCfAccess;
    subById: Record<string, RoleCfAccess>;
};

export const DEFAULT_ROLE_CF_ACCESS: RoleCfAccess = {
    enableCf: true,
    models: [],
};

const asStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0))];
};

export const parseRoleCfAccess = (value: unknown): RoleCfAccess => {
    if (!value || typeof value !== "object") return { ...DEFAULT_ROLE_CF_ACCESS };
    const row = value as Record<string, unknown>;
    return {
        enableCf: row.enableCf !== false,
        models: asStringArray(row.models).filter(isFreeCfTextModel),
    };
};

export const parseAdvisorPolicy = (value: unknown): AdvisorPolicy => {
    const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
    const subByIdRaw = row.subById && typeof row.subById === "object"
        ? row.subById as Record<string, unknown>
        : {};
    const subById: Record<string, RoleCfAccess> = {};
    for (const [id, access] of Object.entries(subByIdRaw)) {
        if (!id.trim()) continue;
        subById[String(id)] = parseRoleCfAccess(access);
    }
    return {
        user: parseRoleCfAccess(row.user),
        subDefault: parseRoleCfAccess(row.subDefault),
        subById,
    };
};

export const resolveRoleCfAccess = (
    actor: AdvisorActorRef,
    policy: AdvisorPolicy
): RoleCfAccess & { inherited: boolean } => {
    if (actor.type === "main") {
        return { enableCf: true, models: [], inherited: false };
    }
    if (actor.type === "user") {
        return { ...policy.user, inherited: false };
    }
    const override = policy.subById[actor.id];
    if (override) return { ...override, inherited: false };
    return { ...policy.subDefault, inherited: true };
};

export const allowedCfModelsForAccess = (access: RoleCfAccess): string[] => {
    const catalog = listFreeCfModelIds();
    if (!access.enableCf) return [];
    if (access.models.length === 0) return catalog;
    return catalog.filter((id) => access.models.includes(id));
};

export const resolveAllowedCfModels = (
    actor: AdvisorActorRef,
    policy: AdvisorPolicy
): string[] => {
    return allowedCfModelsForAccess(resolveRoleCfAccess(actor, policy));
};

export const isCfModelAllowed = (
    actor: AdvisorActorRef,
    policy: AdvisorPolicy,
    modelId: string
): boolean => {
    const access = resolveRoleCfAccess(actor, policy);
    if (!access.enableCf) return false;
    return allowedCfModelsForAccess(access).includes(modelId);
};

export const defaultCfModelForActor = (
    actor: AdvisorActorRef,
    policy: AdvisorPolicy
): string => {
    return pickDefaultCfModel(resolveAllowedCfModels(actor, policy));
};
