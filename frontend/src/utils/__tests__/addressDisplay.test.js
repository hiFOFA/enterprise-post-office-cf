import { describe, expect, it } from 'vitest'
import { displayAddressName, formatOwnerDisplay } from '../addressDisplay'

describe('formatOwnerDisplay', () => {
    it('keeps the creator name for web creates', () => {
        expect(formatOwnerDisplay({
            ownerUsername: '神人来的',
            sourceMeta: 'admin:神人来的',
        })).toBe('神人来的')
    })

    it('appends -api for token creates', () => {
        expect(formatOwnerDisplay({
            ownerUsername: '神人来的',
            sourceMeta: 'admin:神人来的:api',
        })).toBe('神人来的-api')
    })
})

describe('displayAddressName', () => {
    it('shows note when present, otherwise the email', () => {
        expect(displayAddressName('客户A', 'a@mail.example.com')).toBe('客户A')
        expect(displayAddressName('', 'a@mail.example.com')).toBe('a@mail.example.com')
    })
})
