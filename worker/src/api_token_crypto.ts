const bytesToHex = (bytes: Uint8Array): string => (
    [...bytes].map((item) => item.toString(16).padStart(2, "0")).join("")
);

export const hashApiToken = async (token: string): Promise<string> => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    return bytesToHex(new Uint8Array(digest));
};

export const generateApiToken = async (): Promise<{
    token: string;
    prefix: string;
    hash: string;
}> => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const token = `em_${bytesToHex(bytes)}`;
    return {
        token,
        prefix: token.slice(0, 10),
        hash: await hashApiToken(token),
    };
};
