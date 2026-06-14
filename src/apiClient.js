import { API_KEY, PAGE_COUNT } from './config.js';

const BASE = 'https://api.sncf.com/v1/coverage/sncf';

async function fetchJson(url) {
    const resp = await fetch(url, { headers: { 'Authorization': API_KEY } });
    if (!resp.ok) throw new Error('Network error');
    return resp.json();
}

export async function lookupStopArea(query, count = 8) {
    if (!query) return null;
    const url = `${BASE}/places?q=${encodeURIComponent(query)}&type=stop_area&count=${count}`;
    try {
        const json = await fetchJson(url);
        const places = json.places || json.stop_areas || [];
        if (places.length === 0) return null;
        const p = places[0];
        return { id: p.id || p.stop_area || p.uri || null, name: p.name || p.label || query };
    } catch (e) {
        return null;
    }
}

export async function fetchJourneys(fromId, toId, pageCount = PAGE_COUNT) {
    const url = `${BASE}/journeys?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}&max_nb_transfers=0&forbidden_uris%5B%5D=physical_mode%3ACoach&forbidden_uris%5B%5D=physical_mode%3ABus&count=${pageCount}`;
    const json = await fetchJson(url);
    return json;
}

export async function searchPlaces(query, count = 8) {
    if (!query) return [];
    const url = `${BASE}/places?q=${encodeURIComponent(query)}&type=stop_area&count=${count}`;
    try {
        const json = await fetchJson(url);
        const places = json.places || json.stop_areas || [];
        return places.map(p => ({ id: p.id || p.stop_area || p.uri || null, name: p.name || p.label || '' }));
    } catch (e) {
        return [];
    }
}
