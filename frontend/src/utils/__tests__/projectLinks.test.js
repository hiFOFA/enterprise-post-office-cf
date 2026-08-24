import { describe, expect, it } from 'vitest'
import {
    PROJECT_AGENT_DOCS_URL,
    PROJECT_AGENT_SKILL_URL,
    PROJECT_GITHUB_URL,
    PROJECT_SMTP_IMAP_DOCS_URL,
} from '../projectLinks'

const leakedUpstream = /discord|t\.me|dreamhunter|awsl\.uk|temp-mail-docs/i

describe('projectLinks', () => {
    it('points only at the project GitHub profile', () => {
        expect(PROJECT_GITHUB_URL).toBe('https://github.com/hiFOFA/enterprise-post-office-cf')
        expect(PROJECT_GITHUB_URL).not.toMatch(leakedUpstream)
    })

    it('uses local site docs instead of the upstream repo or docs site', () => {
        expect(PROJECT_AGENT_SKILL_URL).toBe('/api-docs/mailbox-user.md')
        expect(PROJECT_AGENT_DOCS_URL).toBe('/api-docs/mailbox-user.md')
        expect(PROJECT_SMTP_IMAP_DOCS_URL).toBe('/api-docs/mailbox-user.md')
        expect(PROJECT_AGENT_SKILL_URL).not.toMatch(leakedUpstream)
        expect(PROJECT_AGENT_DOCS_URL).not.toMatch(leakedUpstream)
        expect(PROJECT_SMTP_IMAP_DOCS_URL).not.toMatch(leakedUpstream)
    })
})
