const CHARSET_TYPES = new Set([
    "application/json",
    "text/html",
    "text/plain",
]);

export const withUtf8Charset = (contentType: string | null): string | null => {
    if (!contentType) return contentType;
    if (/charset=/i.test(contentType)) return contentType;
    const mime = contentType.split(";")[0].trim().toLowerCase();
    if (!CHARSET_TYPES.has(mime)) return contentType;
    return `${contentType.split(";")[0].trim()}; charset=UTF-8`;
};
