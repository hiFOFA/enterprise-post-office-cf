import { getPathWithLocale } from '../i18n/utils'

export const LOCAL_ADDRESS_CACHE_KEY = 'LocalAddressCache'

export const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
    if (!token || typeof token !== 'string' || !token.includes('.')) return null
    try {
        const payload = JSON.parse(
            decodeURIComponent(
                atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
            )
        )
        if (!payload || typeof payload !== 'object') return null
        return payload as Record<string, unknown>
    } catch {
        return null
    }
}

const looksLikeJwt = (value: string): boolean => {
    const parts = value.split('.')
    return parts.length === 3 && parts.every((part) => part.length > 0)
}

export const isAdminAuthTokenValid = (token: unknown): boolean => {
    if (typeof token !== 'string') return false
    const value = token.trim()
    if (!value) return false
    if (!looksLikeJwt(value)) return true
    const payload = decodeJwtPayload(value)
    if (!payload) return false
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
        return false
    }
    return true
}

export const addToLocalAddressCache = (addressJwt: string) => {
    if (!addressJwt || typeof addressJwt !== 'string') return
    try {
        const raw = localStorage.getItem(LOCAL_ADDRESS_CACHE_KEY)
        const parsed = raw ? JSON.parse(raw) : []
        const list = Array.isArray(parsed) ? parsed : []
        if (!list.includes(addressJwt)) {
            list.push(addressJwt)
            localStorage.setItem(LOCAL_ADDRESS_CACHE_KEY, JSON.stringify(list))
        }
    } catch {
        localStorage.setItem(LOCAL_ADDRESS_CACHE_KEY, JSON.stringify([addressJwt]))
    }
}

export const hashPassword = async (password: string) => {
    // user crypto to hash password
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export const getRouterPathWithLang = (path: string, lang: string) => {
    const normalizedLang = lang === 'en'
        || lang === 'es'
        || lang === 'pt-BR'
        || lang === 'ja'
        || lang === 'de'
        ? lang
        : 'zh';

    return getPathWithLocale(path, normalizedLang);
}

export const utcToLocalDate = (utcDate: string, useUTCDate: boolean) => {
    const utcDateString = `${utcDate} UTC`;
    if (useUTCDate) {
        return utcDateString;
    }
    try {
        const date = new Date(utcDateString);
        // if invalid date string
        if (isNaN(date.getTime())) return utcDateString;

        return date.toLocaleString();
    } catch (e) {
        console.error(e);
    }
    return utcDateString;
}
