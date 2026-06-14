import { describe, it, expect } from 'vitest';
import { parseDirectJourneys } from '../src/journeyParser.js';

describe('journeyParser', () => {
    it('parses and filters journeys', () => {
        const api = { journeys: [{ departure_date_time: '20260614T184500', arrival_date_time: '20260614T191700', sections: [{ type: 'public_transport', base_departure_date_time: '20260614T184500', base_arrival_date_time: '20260614T191700', display_informations: { direction: 'Vichy', headsign: '123' } }] }] };
        const out = parseDirectJourneys(api);
        expect(out.length).toBe(1);
        expect(out[0].direction).toBe('Vichy');
    });
});
