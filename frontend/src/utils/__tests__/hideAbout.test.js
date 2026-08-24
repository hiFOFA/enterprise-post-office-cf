import { describe, expect, it } from 'vitest'
import { DEFAULT_HIDE_ABOUT, normalizeHideAbout } from '../hideAbout'

describe('normalizeHideAbout', () => {
    it('defaults to show for main admin and hide for sub-admin and users', () => {
        expect(normalizeHideAbout(undefined)).toEqual(DEFAULT_HIDE_ABOUT)
        expect(DEFAULT_HIDE_ABOUT).toEqual({ main: false, sub: true, user: true })
    })

    it('keeps explicit booleans and fills missing keys', () => {
        expect(normalizeHideAbout({ main: true })).toEqual({
            main: true,
            sub: true,
            user: true,
        })
        expect(normalizeHideAbout({ main: false, sub: false, user: false })).toEqual({
            main: false,
            sub: false,
            user: false,
        })
    })
})
