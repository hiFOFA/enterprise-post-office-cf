export const MAIN_OWNER_GROUP_KEY = "main";
export const MAIN_OWNER_GROUP_NAME = "我自己开的";
export const MAIN_GROUP_ACTOR = { type: "main", id: "main" } as const;

export type DefaultOwnerGroupSpec = {
    key: string;
    name: string;
    ownerType: "main" | "sub";
    ownerId: number | null;
};

export type DefaultOwnerGroupMap = Record<string, number>;

export const subOwnerGroupKey = (id: number): string => `sub:${id}`;

const groupName = (raw: unknown): string => {
    const text = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
    return text.trim().slice(0, 40);
};

export const buildDefaultOwnerGroupSpecs = (
    subAdmins: { id: number; username: string }[]
): DefaultOwnerGroupSpec[] => {
    const specs: DefaultOwnerGroupSpec[] = [{
        key: MAIN_OWNER_GROUP_KEY,
        name: MAIN_OWNER_GROUP_NAME,
        ownerType: "main",
        ownerId: null,
    }];
    const seen = new Set<number>();
    for (const sub of subAdmins) {
        const id = Number(sub.id);
        if (!Number.isInteger(id) || id < 1 || seen.has(id)) continue;
        seen.add(id);
        specs.push({
            key: subOwnerGroupKey(id),
            name: groupName(sub.username) || `子管理 #${id}`,
            ownerType: "sub",
            ownerId: id,
        });
    }
    return specs;
};

export const ownerGroupKeyForAddress = (
    ownerType: string | null | undefined,
    ownerId: number | string | null | undefined
): string => {
    if (ownerType === "sub") {
        const id = Number(ownerId);
        if (Number.isInteger(id) && id > 0) return subOwnerGroupKey(id);
    }
    return MAIN_OWNER_GROUP_KEY;
};

export const parseDefaultOwnerGroupMap = (raw: unknown): DefaultOwnerGroupMap => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const result: DefaultOwnerGroupMap = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        const id = Number(value);
        if ((key === MAIN_OWNER_GROUP_KEY || /^sub:\d+$/.test(key)) && Number.isInteger(id) && id > 0) {
            result[key] = id;
        }
    }
    return result;
};

export const isDefaultOwnerGroupId = (map: DefaultOwnerGroupMap, groupId: number): boolean => (
    Object.values(map).includes(groupId)
);
