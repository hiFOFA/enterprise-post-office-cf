import { describe, it, expect } from 'vitest'
import { isAdminAuthTokenValid } from '../index'

const encodeJwt = (payload) => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
    return `${header}.${body}.sig`
}

describe('isAdminAuthTokenValid', () => {
    it('rejects empty tokens', () => {
        expect(isAdminAuthTokenValid('')).toBe(false)
        expect(isAdminAuthTokenValid('   ')).toBe(false)
        expect(isAdminAuthTokenValid(null)).toBe(false)
        expect(isAdminAuthTokenValid(undefined)).toBe(false)
    })

    it('treats legacy plaintext admin passwords as valid', () => {
        expect(isAdminAuthTokenValid('legacy-admin-password')).toBe(true)
    })

    it('accepts an unexpired admin JWT', () => {
        const token = encodeJwt({
            typ: 'admin',
            role: 'main',
            username: 'god',
            exp: Math.floor(Date.now() / 1000) + 3600,
        })
        expect(isAdminAuthTokenValid(token)).toBe(true)
    })

    it('rejects an expired admin JWT', () => {
        const token = encodeJwt({
            typ: 'admin',
            role: 'main',
            username: 'god',
            exp: Math.floor(Date.now() / 1000) - 10,
        })
        expect(isAdminAuthTokenValid(token)).toBe(false)
    })

    it('rejects a JWT-shaped token that cannot be decoded', () => {
        expect(isAdminAuthTokenValid('abc.!!!notjson!!!.sig')).toBe(false)
    })
})
