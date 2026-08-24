export const PUBLIC_OPEN_API_PATHS = [
    "/open_api/bootstrap",
    "/open_api/site_login",
    "/open_api/admin_login",
    "/open_api/credential_login",
] as const;

const BOOTSTRAP_KEYS = [
    "title",
    "announcement",
    "alwaysShowAnnouncement",
    "prefix",
    "addressRegex",
    "minAddressLen",
    "maxAddressLen",
    "defaultDomains",
    "domains",
    "domainLabels",
    "needAuth",
    "adminContact",
    "enableUserCreateEmail",
    "disableAnonymousUserCreateEmail",
    "disableCustomAddressName",
    "enableIndexAbout",
    "copyright",
    "cfTurnstileSiteKey",
    "showGithub",
    "showGithubForUser",
    "hideAbout",
    "disableAdminPasswordCheck",
    "enableAddressPassword",
    "enableGlobalTurnstileCheck",
] as const;

export const isPublicOpenApiPath = (path: string): boolean => (
    PUBLIC_OPEN_API_PATHS.some((item) => path === item || path.startsWith(`${item}/`))
);

export const hasCredentialHeader = (
    authorization: string | null | undefined,
    adminAuth: string | null | undefined,
): boolean => Boolean((authorization || "").trim() || (adminAuth || "").trim());

export const pickBootstrapSettings = (
    full: Record<string, unknown>
): Record<string, unknown> => {
    const slim: Record<string, unknown> = {};
    for (const key of BOOTSTRAP_KEYS) {
        if (key in full) slim[key] = full[key];
    }
    return slim;
};
