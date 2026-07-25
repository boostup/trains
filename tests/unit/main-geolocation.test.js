import { vi } from 'vitest';
import { getHaversineDistance } from '../../src/utils.js';
import { DEFAULT_STATIONS } from '../../src/constants.js';

/**
 * Simulates the proximity logic from initGeolocationAndProximity()
 * for a given user position, returning which station would be selected
 * as the origin (from).
 */
function getOriginForPosition(lat, lon) {
    const distToStGermain = getHaversineDistance(lat, lon, DEFAULT_STATIONS.ST_GERMAIN.lat, DEFAULT_STATIONS.ST_GERMAIN.lon);
    const distToVichy = getHaversineDistance(lat, lon, DEFAULT_STATIONS.VICHY.lat, DEFAULT_STATIONS.VICHY.lon);

    if (distToVichy < distToStGermain) {
        return DEFAULT_STATIONS.VICHY;
    }
    return DEFAULT_STATIONS.ST_GERMAIN;
}

describe('geolocation proximity origin selection', () => {
    it('should select Vichy as origin when user is at Vichy station', () => {
        const origin = getOriginForPosition(46.1244, 3.4275);
        expect(origin.name).toBe('Vichy');
    });

    it('should select Vichy as origin when user is very close to Vichy station', () => {
        // 500 meters from Vichy station
        const origin = getOriginForPosition(46.1285, 3.4280);
        expect(origin.name).toBe('Vichy');
    });

    it('should select St Germain as origin when user is at St Germain station', () => {
        const origin = getOriginForPosition(46.2019, 3.4288);
        expect(origin.name).toBe('St-Germain-des-Fossés');
    });

    it('should select St Germain as origin when user is very close to St Germain station', () => {
        // 500 meters from St Germain station
        const origin = getOriginForPosition(46.2055, 3.4300);
        expect(origin.name).toBe('St-Germain-des-Fossés');
    });

    it('should select Vichy as origin when user is in central Vichy city (46.13, 3.44)', () => {
        // A point in central Vichy, roughly where a person would be standing
        const origin = getOriginForPosition(46.13, 3.44);
        expect(origin.name).toBe('Vichy');
    });

    it('should select St Germain as origin when user is clearly north of Vichy (paris area)', () => {
        // Paris is far north of both stations
        const origin = getOriginForPosition(48.8566, 2.3522);
        expect(origin.name).toBe('St-Germain-des-Fossés');
    });

    it('should select Vichy as origin when user is clearly south of both stations', () => {
        // A point south of both stations (Lyon area)
        const origin = getOriginForPosition(45.7640, 4.8357);
        expect(origin.name).toBe('Vichy');
    });

    it('should find both stations within 15 km of a position in Vichy', () => {
        const distToStGermain = getHaversineDistance(46.13, 3.44, DEFAULT_STATIONS.ST_GERMAIN.lat, DEFAULT_STATIONS.ST_GERMAIN.lon);
        const distToVichy = getHaversineDistance(46.13, 3.44, DEFAULT_STATIONS.VICHY.lat, DEFAULT_STATIONS.VICHY.lon);

        expect(distToStGermain).toBeLessThan(15);
        expect(distToVichy).toBeLessThan(15);
    });

    it('should have equal distances at midpoint between the two stations', () => {
        // Midpoint lat/lon between St Germain and Vichy
        const midLat = (DEFAULT_STATIONS.ST_GERMAIN.lat + DEFAULT_STATIONS.VICHY.lat) / 2;
        const midLon = (DEFAULT_STATIONS.ST_GERMAIN.lon + DEFAULT_STATIONS.VICHY.lon) / 2;

        const distToStGermain = getHaversineDistance(midLat, midLon, DEFAULT_STATIONS.ST_GERMAIN.lat, DEFAULT_STATIONS.ST_GERMAIN.lon);
        const distToVichy = getHaversineDistance(midLat, midLon, DEFAULT_STATIONS.VICHY.lat, DEFAULT_STATIONS.VICHY.lon);

        // At the midpoint, distances should be approximately equal
        expect(Math.abs(distToStGermain - distToVichy)).toBeLessThan(0.1);
    });
});
