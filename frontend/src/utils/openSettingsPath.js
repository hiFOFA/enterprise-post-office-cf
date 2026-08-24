export const openSettingsPath = (hasCredential) => (
    hasCredential ? '/open_api/settings' : '/open_api/bootstrap'
);
