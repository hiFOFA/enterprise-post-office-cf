export type TokenRole = "main" | "sub" | "user";
export type TokenAccess = "read" | "write";

export type TokenScopeDef = {
    id: string;
    category: string;
    access: TokenAccess;
    roles: TokenRole[];
};

export type TokenCatalogGroup = {
    id: string;
    read: TokenScopeDef[];
    write: TokenScopeDef[];
};

const ALL_ROLES: TokenRole[] = ["main", "sub", "user"];
const ADMIN_ROLES: TokenRole[] = ["main", "sub"];

const SCOPES: TokenScopeDef[] = [
    { id: "address.list.read", category: "address", access: "read", roles: ALL_ROLES },
    { id: "address.credential.read", category: "address", access: "read", roles: ALL_ROLES },
    { id: "address.create.write", category: "address", access: "write", roles: ADMIN_ROLES },
    { id: "address.password.write", category: "address", access: "write", roles: ALL_ROLES },
    { id: "address.delete.write", category: "address", access: "write", roles: ALL_ROLES },
    { id: "address.clear_inbox.write", category: "address", access: "write", roles: ALL_ROLES },
    { id: "address.clear_sent.write", category: "address", access: "write", roles: ALL_ROLES },
    { id: "address.group.read", category: "address", access: "read", roles: ALL_ROLES },
    { id: "address.group.write", category: "address", access: "write", roles: ALL_ROLES },
    { id: "address.note.write", category: "address", access: "write", roles: ALL_ROLES },

    { id: "mail.inbox.read", category: "mail", access: "read", roles: ALL_ROLES },
    { id: "mail.inbox.write", category: "mail", access: "write", roles: ALL_ROLES },
    { id: "mail.unknown.read", category: "mail", access: "read", roles: ["main"] },
    { id: "mail.sendbox.read", category: "mail", access: "read", roles: ALL_ROLES },
    { id: "mail.sendbox.write", category: "mail", access: "write", roles: ALL_ROLES },

    { id: "send.mail.write", category: "send", access: "write", roles: ALL_ROLES },
    { id: "send.request.write", category: "send", access: "write", roles: ["user"] },

    { id: "sender_access.list.read", category: "sender_access", access: "read", roles: ["main"] },
    { id: "sender_access.update.write", category: "sender_access", access: "write", roles: ["main"] },
    { id: "sender_access.delete.write", category: "sender_access", access: "write", roles: ["main"] },

    { id: "settings.account.read", category: "settings", access: "read", roles: ["main"] },
    { id: "settings.account.write", category: "settings", access: "write", roles: ["main"] },
    { id: "settings.ip.read", category: "settings", access: "read", roles: ["main"] },
    { id: "settings.ip.write", category: "settings", access: "write", roles: ["main"] },
    { id: "settings.webhook.read", category: "settings", access: "read", roles: ["main"] },
    { id: "settings.webhook.write", category: "settings", access: "write", roles: ["main"] },
    { id: "settings.mail_webhook.read", category: "settings", access: "read", roles: ["main"] },
    { id: "settings.mail_webhook.write", category: "settings", access: "write", roles: ["main"] },

    { id: "sub_admin.list.read", category: "sub_admin", access: "read", roles: ["main"] },
    { id: "sub_admin.ledger.read", category: "sub_admin", access: "read", roles: ["main"] },
    { id: "sub_admin.costs.read", category: "sub_admin", access: "read", roles: ["main"] },
    { id: "sub_admin.manage.write", category: "sub_admin", access: "write", roles: ["main"] },
    { id: "sub_admin.quota.write", category: "sub_admin", access: "write", roles: ["main"] },
    { id: "sub_admin.costs.write", category: "sub_admin", access: "write", roles: ["main"] },

    { id: "ai_advisor.read", category: "ai_advisor", access: "read", roles: ALL_ROLES },
    { id: "ai_advisor.write", category: "ai_advisor", access: "write", roles: ALL_ROLES },
    { id: "ai_advisor.policy.read", category: "ai_advisor", access: "read", roles: ["main"] },
    { id: "ai_advisor.policy.write", category: "ai_advisor", access: "write", roles: ["main"] },

    { id: "telegram.read", category: "telegram", access: "read", roles: ["main"] },
    { id: "telegram.write", category: "telegram", access: "write", roles: ["main"] },

    { id: "statistics.read", category: "statistics", access: "read", roles: ["main"] },

    { id: "maintenance.read", category: "maintenance", access: "read", roles: ["main"] },
    { id: "maintenance.write", category: "maintenance", access: "write", roles: ["main"] },

    { id: "appearance.read", category: "appearance", access: "read", roles: ["main"] },
    { id: "appearance.write", category: "appearance", access: "write", roles: ["main"] },

    { id: "self_service.read", category: "self_service", access: "read", roles: ["user"] },
    { id: "self_service.write", category: "self_service", access: "write", roles: ["user"] },
];

const CATEGORY_ORDER = [
    "address",
    "mail",
    "send",
    "sender_access",
    "settings",
    "sub_admin",
    "ai_advisor",
    "telegram",
    "statistics",
    "maintenance",
    "appearance",
    "self_service",
];

export const listAllScopes = (): TokenScopeDef[] => [...SCOPES];

export const scopesForRole = (role: TokenRole): TokenScopeDef[] => (
    SCOPES.filter((item) => item.roles.includes(role))
);

export const catalogForRole = (role: TokenRole): TokenCatalogGroup[] => {
    const allowed = scopesForRole(role);
    return CATEGORY_ORDER
        .map((id) => ({
            id,
            read: allowed.filter((item) => item.category === id && item.access === "read"),
            write: allowed.filter((item) => item.category === id && item.access === "write"),
        }))
        .filter((group) => group.read.length > 0 || group.write.length > 0);
};

export const buildTokenCreatePayload = (
    role: TokenRole,
    name: string,
    rawScopes: string[]
): { name: string; scopes: string[] } => {
    const trimmed = (name || "").trim();
    if (!trimmed) throw new Error("RequiredField");
    return {
        name: trimmed,
        scopes: expandGrantedScopes(role, Array.isArray(rawScopes) ? rawScopes : []),
    };
};

export const expandGrantedScopes = (role: TokenRole, raw: string[]): string[] => {
    const allowed = scopesForRole(role);
    const allowedIds = new Set(allowed.map((item) => item.id));
    if (!raw.length) return allowed.map((item) => item.id);

    const selected = new Set<string>();
    for (const value of raw) {
        if (allowedIds.has(value)) {
            selected.add(value);
            continue;
        }
        const categoryMatch = value.match(/^([a-z_]+)\.(read|write)$/);
        if (!categoryMatch) continue;
        const [, category, access] = categoryMatch;
        for (const item of allowed) {
            if (item.category === category && item.access === access) selected.add(item.id);
        }
    }
    return [...selected];
};

const matchPath = (path: string, pattern: RegExp): boolean => pattern.test(path);

export const scopeForRequest = (method: string, path: string): string | null => {
    const verb = method.toUpperCase();

    if (matchPath(path, /^\/api\/parsed_mails$/) && verb === "GET") return "mail.inbox.read";
    if (matchPath(path, /^\/api\/parsed_mail\/[^/]+$/) && verb === "GET") return "mail.inbox.read";
    if (matchPath(path, /^\/api\/mails$/) && verb === "GET") return "mail.inbox.read";
    if (matchPath(path, /^\/api\/mail\/[^/]+$/) && verb === "GET") return "mail.inbox.read";
    if (matchPath(path, /^\/admin\/mails$/) && verb === "GET") return "mail.inbox.read";
    if (matchPath(path, /^\/admin\/mails\/[^/]+$/) && verb === "GET") return "mail.inbox.read";
    if (matchPath(path, /^\/admin\/mails_unknow$/) && verb === "GET") return "mail.unknown.read";
    if (matchPath(path, /^\/admin\/mails\/[^/]+$/) && verb === "DELETE") return "mail.inbox.write";
    if (matchPath(path, /^\/api\/mails\/[^/]+$/) && verb === "DELETE") return "mail.inbox.write";

    if (matchPath(path, /^\/api\/sendbox$/) && verb === "GET") return "mail.sendbox.read";
    if (matchPath(path, /^\/admin\/sendbox$/) && verb === "GET") return "mail.sendbox.read";
    if (matchPath(path, /^\/api\/sendbox\/[^/]+$/) && verb === "DELETE") return "mail.sendbox.write";
    if (matchPath(path, /^\/admin\/sendbox\/[^/]+$/) && verb === "DELETE") return "mail.sendbox.write";

    if (matchPath(path, /^\/admin\/address$/) && verb === "GET") return "address.list.read";
    if (matchPath(path, /^\/api\/settings$/) && verb === "GET") return null;
    if (matchPath(path, /^\/admin\/show_password\/[^/]+$/) && verb === "GET") return "address.credential.read";
    if (matchPath(path, /^\/admin\/new_address$/) && verb === "POST") return "address.create.write";
    if (matchPath(path, /^\/admin\/address\/[^/]+\/reset_password$/) && verb === "POST") return "address.password.write";
    if (matchPath(path, /^\/api\/address_change_password$/) && verb === "POST") return "address.password.write";
    if (matchPath(path, /^\/admin\/delete_address\/[^/]+$/) && verb === "DELETE") return "address.delete.write";
    if (matchPath(path, /^\/api\/delete_address$/) && verb === "DELETE") return "address.delete.write";
    if (matchPath(path, /^\/admin\/clear_inbox\/[^/]+$/) && verb === "DELETE") return "address.clear_inbox.write";
    if (matchPath(path, /^\/api\/clear_inbox$/) && verb === "DELETE") return "address.clear_inbox.write";
    if (matchPath(path, /^\/admin\/clear_sent_items\/[^/]+$/) && verb === "DELETE") return "address.clear_sent.write";
    if (matchPath(path, /^\/api\/clear_sent_items$/) && verb === "DELETE") return "address.clear_sent.write";
    if (matchPath(path, /^\/(admin|api)\/address_groups$/) && verb === "GET") return "address.group.read";
    if (matchPath(path, /^\/(admin|api)\/address_groups\/[^/]+\/members$/) && verb === "GET") return "address.group.read";
    if (matchPath(path, /^\/(admin|api)\/address_notes$/) && verb === "GET") return "address.group.read";
    if (matchPath(path, /^\/admin\/group_limits$/) && verb === "GET") return "address.group.read";
    if (matchPath(path, /^\/(admin|api)\/address_groups$/) && verb === "POST") return "address.group.write";
    if (matchPath(path, /^\/(admin|api)\/address_groups\/[^/]+$/) && (verb === "POST" || verb === "DELETE")) return "address.group.write";
    if (matchPath(path, /^\/(admin|api)\/address_groups\/[^/]+\/members$/) && (verb === "POST" || verb === "DELETE")) {
        return "address.group.write";
    }
    if (matchPath(path, /^\/admin\/group_limits$/) && verb === "POST") return "address.group.write";
    if (matchPath(path, /^\/(admin|api)\/address\/[^/]+\/note$/) && verb === "POST") return "address.note.write";

    if (matchPath(path, /^\/api\/request_send_mail_access$/) && verb === "POST") return "send.request.write";
    if (matchPath(path, /^\/api\/send_mail$/) && verb === "POST") return "send.mail.write";
    if (matchPath(path, /^\/admin\/send_mail$/) && verb === "POST") return "send.mail.write";
    if (matchPath(path, /^\/admin\/send_mail_by_binding$/) && verb === "POST") return "send.mail.write";

    if (matchPath(path, /^\/admin\/address_sender$/) && verb === "GET") return "sender_access.list.read";
    if (matchPath(path, /^\/admin\/address_sender$/) && verb === "POST") return "sender_access.update.write";
    if (matchPath(path, /^\/admin\/address_sender\/[^/]+$/) && verb === "DELETE") return "sender_access.delete.write";

    if (matchPath(path, /^\/admin\/account_settings$/) && verb === "GET") return "settings.account.read";
    if (matchPath(path, /^\/admin\/account_settings$/) && verb === "POST") return "settings.account.write";
    if (matchPath(path, /^\/admin\/ip_blacklist\/settings$/) && verb === "GET") return "settings.ip.read";
    if (matchPath(path, /^\/admin\/ip_blacklist\/settings$/) && verb === "POST") return "settings.ip.write";
    if (matchPath(path, /^\/admin\/webhook\/settings$/) && verb === "GET") return "settings.webhook.read";
    if (matchPath(path, /^\/admin\/webhook\/settings$/) && verb === "POST") return "settings.webhook.write";
    if (matchPath(path, /^\/admin\/mail_webhook\/settings$/) && verb === "GET") return "settings.mail_webhook.read";
    if (matchPath(path, /^\/admin\/mail_webhook\/settings$/) && verb === "POST") return "settings.mail_webhook.write";
    if (matchPath(path, /^\/admin\/mail_webhook\/test$/) && verb === "POST") return "settings.mail_webhook.write";

    if (matchPath(path, /^\/admin\/sub_admins$/) && verb === "GET") return "sub_admin.list.read";
    if (matchPath(path, /^\/admin\/sub_admins\/[^/]+\/ledger$/) && verb === "GET") return "sub_admin.ledger.read";
    if (matchPath(path, /^\/admin\/domain_create_costs$/) && verb === "GET") return "sub_admin.costs.read";
    if (matchPath(path, /^\/admin\/domain_create_costs$/) && verb === "POST") return "sub_admin.costs.write";
    if (matchPath(path, /^\/admin\/sub_admins$/) && verb === "POST") return "sub_admin.manage.write";
    if (matchPath(path, /^\/admin\/sub_admins\/[^/]+$/) && (verb === "POST" || verb === "DELETE")) return "sub_admin.manage.write";
    if (matchPath(path, /^\/admin\/sub_admins\/[^/]+\/quota$/) && verb === "POST") return "sub_admin.quota.write";

    if (matchPath(path, /^\/(admin|api)\/ai_advisor\/policy$/) && verb === "GET") return "ai_advisor.policy.read";
    if (matchPath(path, /^\/(admin|api)\/ai_advisor\/policy$/) && verb === "POST") return "ai_advisor.policy.write";
    if (matchPath(path, /^\/(admin|api)\/ai_advisor\/(mailboxes|auth|messages|models|provider)$/) && verb === "GET") {
        return "ai_advisor.read";
    }
    if (matchPath(path, /^\/(admin|api)\/ai_advisor\/(auth|messages|chat|provider|test)$/) && (verb === "POST" || verb === "DELETE")) {
        return "ai_advisor.write";
    }

    if (matchPath(path, /^\/admin\/telegram\/(status|settings)$/) && verb === "GET") return "telegram.read";
    if (matchPath(path, /^\/admin\/telegram\/(init|settings)$/) && verb === "POST") return "telegram.write";

    if (matchPath(path, /^\/admin\/statistics$/) && verb === "GET") return "statistics.read";

    if (matchPath(path, /^\/admin\/(db_version|worker\/configs|auto_cleanup)$/) && verb === "GET") return "maintenance.read";
    if (matchPath(path, /^\/admin\/(db_initialize|db_migration|cleanup|auto_cleanup)$/) && verb === "POST") {
        return "maintenance.write";
    }

    if (matchPath(path, /^\/admin\/global_ui_prefs$/) && verb === "GET") return "appearance.read";
    if (matchPath(path, /^\/admin\/global_ui_prefs$/) && verb === "POST") return "appearance.write";

    if (matchPath(path, /^\/api\/(auto_reply|webhook\/settings|attachment\/list)$/) && verb === "GET") {
        return "self_service.read";
    }
    if (matchPath(path, /^\/api\/(auto_reply|webhook\/settings|webhook\/test|attachment\/delete|attachment\/put_url|attachment\/get_url)$/) && verb === "POST") {
        return "self_service.write";
    }

    return null;
};

export const hasGrantedScope = (granted: string[], needed: string | null): boolean => {
    if (!needed) return true;
    return granted.includes(needed);
};

export const extractApiToken = (authorization: string | null | undefined): string | null => {
    if (!authorization) return null;
    const value = authorization.replace(/^Bearer\s+/i, "").trim();
    return /^em_[0-9a-f]{48}$/i.test(value) ? value : null;
};

export const isApiTokenManagementPath = (path: string): boolean => (
    /^\/(admin|api)\/api_tokens(\/|$)/.test(path)
);

export const authorizeApiTokenRequest = (
    granted: string[],
    method: string,
    path: string
): "ok" | "forbidden" | "unmapped" => {
    if (isApiTokenManagementPath(path)) return "forbidden";
    if (method.toUpperCase() === "GET" && (path === "/api/settings" || path === "/open_api/settings")) {
        return "ok";
    }
    const needed = scopeForRequest(method, path);
    if (!needed) return "unmapped";
    return hasGrantedScope(granted, needed) ? "ok" : "forbidden";
};
