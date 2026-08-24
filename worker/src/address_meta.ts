export type GroupActorType = "main" | "sub" | "user";

export type GroupLimits = {
    sub: number;
    user: number;
};

export const DEFAULT_GROUP_LIMITS: GroupLimits = { sub: 10, user: 10 };
export const NOTE_MAX_LENGTH = 200;
export const GROUP_NAME_MAX_LENGTH = 40;

export const buildAdminSourceMeta = (username: string | null | undefined, viaApi: boolean): string => {
    const name = (username || "").trim() || "main";
    return viaApi ? `admin:${name}:api` : `admin:${name}`;
};

export const isAdminApiSource = (sourceMeta: string | null | undefined): boolean => {
    const value = (sourceMeta || "").trim();
    return value.startsWith("admin:") && value.endsWith(":api");
};

export const formatOwnerDisplay = (row: {
    ownerUsername?: string | null;
    owner_username?: string | null;
    createdBy?: string | null;
    created_by?: string | null;
    owner?: string | null;
    sourceMeta?: string | null;
    source_meta?: string | null;
    ownerAdminType?: string | null;
    owner_admin_type?: string | null;
    ownerAdminId?: number | string | null;
    owner_admin_id?: number | string | null;
    fallbackMain?: string;
    fallbackSub?: string;
}): string => {
    const name = row.ownerUsername
        || row.owner_username
        || row.createdBy
        || row.created_by
        || row.owner
        || "";
    const sourceMeta = row.sourceMeta ?? row.source_meta;
    if (name) {
        return isAdminApiSource(sourceMeta) ? `${name}-api` : name;
    }
    const ownerType = row.ownerAdminType || row.owner_admin_type;
    if (ownerType === "main") return row.fallbackMain || "main";
    if (ownerType === "sub") {
        const id = row.ownerAdminId ?? row.owner_admin_id;
        const label = row.fallbackSub || "sub";
        return id ? `${label} #${id}` : label;
    }
    return "";
};

export const displayAddressName = (
    note: string | null | undefined,
    email: string | null | undefined
): string => {
    const trimmed = (note || "").trim();
    return trimmed || (email || "");
};

const toLimit = (value: unknown, fallback: number): number => {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.floor(parsed);
};

export const normalizeGroupLimits = (raw: unknown): GroupLimits => {
    const source = raw && typeof raw === "object" && !Array.isArray(raw)
        ? raw as Record<string, unknown>
        : {};
    return {
        sub: toLimit(source.sub, DEFAULT_GROUP_LIMITS.sub),
        user: toLimit(source.user, DEFAULT_GROUP_LIMITS.user),
    };
};

export const groupLimitFor = (actorType: GroupActorType, limits: GroupLimits): number | null => {
    if (actorType === "main") return null;
    return actorType === "sub" ? limits.sub : limits.user;
};

export const canCreateMoreGroups = (
    actorType: GroupActorType,
    currentCount: number,
    limits: GroupLimits
): boolean => {
    const max = groupLimitFor(actorType, limits);
    if (max == null) return true;
    return currentCount < max;
};

export const normalizeNote = (raw: unknown): string => {
    const text = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
    return text.trim().slice(0, NOTE_MAX_LENGTH);
};

export const normalizeGroupName = (raw: unknown): string => {
    const text = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
    return text.trim().slice(0, GROUP_NAME_MAX_LENGTH);
};

export const parseOptionalGroupId = (raw: unknown): number | null => {
    if (raw == null || raw === "") return null;
    const value = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error("InvalidGroupId");
    }
    return value;
};
