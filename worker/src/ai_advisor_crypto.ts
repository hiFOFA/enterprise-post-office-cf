const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

const deriveAesKey = async (secret: string): Promise<CryptoKey> => {
    const hash = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
    return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
};

export const encryptSecret = async (secret: string, plaintext: string): Promise<string> => {
    const key = await deriveAesKey(secret);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext));
    return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
};

export const decryptSecret = async (secret: string, payload: string): Promise<string> => {
    const [ivPart, dataPart] = payload.split(".");
    if (!ivPart || !dataPart) throw new Error("invalid ciphertext");
    const key = await deriveAesKey(secret);
    const iv = base64ToBytes(ivPart);
    const data = base64ToBytes(dataPart);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return decoder.decode(decrypted);
};

export const maskApiKey = (value: string | null | undefined): string => {
    const key = (value || "").trim();
    if (!key) return "";
    if (key.length <= 4) return "****";
    return `${"*".repeat(Math.min(12, key.length - 4))}${key.slice(-4)}`;
};
