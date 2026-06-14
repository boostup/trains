import { describe, it, expect } from 'vitest';
import { getDisplayTime, getDisplayDate, getDistance } from '../src/utils.js';

describe('utils', () => {
    it('formats time correctly', () => {
        expect(getDisplayTime('20260614T184500')).toBe('18:45');
    });

    it('formats date string', () => {
        const d = getDisplayDate('20260614T184500');
        expect(typeof d).toBe('string');
    });

    it('calculates distance', () => {
        const d = getDistance(46.2019, 3.4288, 46.1244, 3.4275);
        expect(typeof d).toBe('number');
        expect(d).toBeGreaterThan(0);
    });
});
