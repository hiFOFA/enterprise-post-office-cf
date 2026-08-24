import { describe, it, expect } from 'vitest';
import { openSettingsPath } from '../openSettingsPath';

describe('openSettingsPath', () => {
    it('uses bootstrap before login and settings after a credential exists', () => {
        expect(openSettingsPath(false)).toBe('/open_api/bootstrap');
        expect(openSettingsPath(true)).toBe('/open_api/settings');
    });
});
