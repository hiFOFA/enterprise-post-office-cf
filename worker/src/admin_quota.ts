import { CONSTANTS } from "./constants";

export type DomainCreateCosts = Record<string, number>;

export const getDomainCreateCost = (
    costs: DomainCreateCosts | null | undefined,
    domain: string
): number => {
    const normalized = (domain || "").trim().toLowerCase();
    if (!normalized) {
        return CONSTANTS.DEFAULT_DOMAIN_CREATE_COST;
    }
    const table = costs || {};
    const exact = table[normalized];
    if (typeof exact === "number" && Number.isFinite(exact)) {
        return Math.max(0, Math.floor(exact));
    }
    const parts = normalized.split(".");
    for (let i = 1; i < parts.length; i++) {
        const parent = parts.slice(i).join(".");
        const parentCost = table[parent];
        if (typeof parentCost === "number" && Number.isFinite(parentCost)) {
            return Math.max(0, Math.floor(parentCost));
        }
    }
    return CONSTANTS.DEFAULT_DOMAIN_CREATE_COST;
}

export const parseExpireDaysSetting = (
    raw: string | number | null | undefined
): number | null => {
    if (raw == null || raw === "") {
        return null;
    }
    const value = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(value) || value < 1) {
        return null;
    }
    return Math.floor(value);
}

export const resolveExpireDays = (
    requested: number | string | null | undefined,
    defaultDays: number | null,
    isSubAdmin: boolean
): number | null => {
    if (requested != null && requested !== "") {
        const requestedDays = parseExpireDaysSetting(Number(requested));
        if (requestedDays == null) {
            throw new Error("InvalidExpireDaysMsg");
        }
        return isSubAdmin && requestedDays > CONSTANTS.SUB_ADMIN_MAX_EXPIRE_DAYS
            ? CONSTANTS.SUB_ADMIN_MAX_EXPIRE_DAYS
            : requestedDays;
    }
    const days = defaultDays ?? (isSubAdmin ? CONSTANTS.SUB_ADMIN_MAX_EXPIRE_DAYS : null);
    if (days == null) {
        return isSubAdmin ? CONSTANTS.SUB_ADMIN_MAX_EXPIRE_DAYS : null;
    }
    if (isSubAdmin && days > CONSTANTS.SUB_ADMIN_MAX_EXPIRE_DAYS) {
        return CONSTANTS.SUB_ADMIN_MAX_EXPIRE_DAYS;
    }
    return days;
}

export const normalizeDomainCreateCosts = (
    input: unknown
): DomainCreateCosts => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return {};
    }
    const result: DomainCreateCosts = {};
    for (const [domain, cost] of Object.entries(input as Record<string, unknown>)) {
        const name = domain.trim().toLowerCase();
        const value = Number(cost);
        if (!name || !Number.isFinite(value) || value < 0) {
            continue;
        }
        result[name] = Math.floor(value);
    }
    return result;
}

const SUB_ADMIN_ALLOWED_PATHS: RegExp[] = [
    /^\/admin\/address$/,
    /^\/admin\/new_address$/,
    /^\/admin\/delete_address\/[^/]+$/,
    /^\/admin\/clear_inbox\/[^/]+$/,
    /^\/admin\/clear_sent_items\/[^/]+$/,
    /^\/admin\/show_password\/[^/]+$/,
    /^\/admin\/address\/[^/]+\/reset_password$/,
    /^\/admin\/mails$/,
    /^\/admin\/mails\/[^/]+$/,
    /^\/admin\/sendbox$/,
    /^\/admin\/sendbox\/[^/]+$/,
    /^\/admin\/send_mail$/,
    /^\/admin\/send_mail_by_binding$/,
    /^\/admin\/domain_create_costs$/,
    /^\/admin\/ai_advisor\/mailboxes$/,
    /^\/admin\/ai_advisor\/auth$/,
    /^\/admin\/ai_advisor\/messages$/,
    /^\/admin\/ai_advisor\/chat$/,
    /^\/admin\/ai_advisor\/models$/,
    /^\/admin\/ai_advisor\/provider$/,
    /^\/admin\/ai_advisor\/test$/,
    /^\/admin\/api_tokens$/,
    /^\/admin\/api_tokens\/catalog$/,
    /^\/admin\/api_tokens\/[^/]+$/,
    /^\/admin\/address_notes$/,
    /^\/admin\/address\/[^/]+\/note$/,
    /^\/admin\/address_groups$/,
    /^\/admin\/address_groups\/[^/]+$/,
    /^\/admin\/address_groups\/[^/]+\/members$/,
    /^\/admin\/group_limits$/,
];

export const isForbiddenForSubAdmin = (path: string, method: string): boolean => {
    if (path === "/admin/domain_create_costs" && method !== "GET") {
        return true;
    }
    if (path === "/admin/group_limits" && method !== "GET") {
        return true;
    }
    if (path === "/admin/mails_unknow") {
        return true;
    }
    return !SUB_ADMIN_ALLOWED_PATHS.some((pattern) => pattern.test(path));
}
