import '../styles.css';
import { API_KEY, DEFAULT_STATIONS, AUTO_TOGGLE_KEY } from './config.js';
import { lookupStopArea, fetchJourneys, searchPlaces } from './apiClient.js';
import { parseDirectJourneys } from './journeyParser.js';
import { renderLoading, renderError, renderJourneys, renderMessage } from './ui.js';
import { renderDestinationSuggestions, clearDestinationSuggestions } from './ui.js';
import { getDistance } from './utils.js';

const ST_GERMAIN = DEFAULT_STATIONS.ST_GERMAIN;
const VICHY = DEFAULT_STATIONS.VICHY;

let currentConfig = { from: { id: ST_GERMAIN }, to: { id: VICHY, name: 'Vichy' }, label: 'St-Germain ➔ Vichy' };

function buildRouteLabel() {
    const fromName = currentConfig.from && currentConfig.from.name
        ? currentConfig.from.name
        : currentConfig.from && currentConfig.from.id === ST_GERMAIN
            ? 'St-Germain'
            : 'Vichy';
    const toName = currentConfig.to && currentConfig.to.name ? currentConfig.to.name : '';
    return toName ? `${fromName} ➔ ${toName}` : `${fromName} — Choisir destination`;
}

function updateRouteDisplay() {
    const routeDisplay = document.getElementById('routeDisplay');
    if (!routeDisplay) return;
    routeDisplay.textContent = currentConfig.label || buildRouteLabel();
}

function getDestinationString(currentConfig, destInputEl) {
    if (typeof currentConfig.to === 'string') return currentConfig.to.trim();
    if (currentConfig.to && typeof currentConfig.to === 'object' && currentConfig.to.name) return String(currentConfig.to.name).trim();
    return (destInputEl && destInputEl.value) || '';
}

async function fetchAndRender() {
    const board = document.getElementById('board');
    if (!currentConfig.to || !currentConfig.to.id) {
        renderMessage(board, 'Choisissez une destination valide ou activez l\'option automatique.');
        return;
    }
    currentConfig.label = buildRouteLabel();
    renderLoading(board);
    updateRouteDisplay();
    try {
        const json = await fetchJourneys(currentConfig.from.id, currentConfig.to.id);
        const departures = parseDirectJourneys(json);
        renderJourneys(board, departures, currentConfig.label);
    } catch (e) {
        console.error('fetchAndRender error:', e);
        renderError(board, 'Erreur réseau ou clé API invalide.');
    }
}

function initControls() {
    const autoToggleEl = document.getElementById('autoToggle');
    const destInputEl = document.getElementById('destInput');
    const destBtnEl = document.getElementById('destBtn');
    const destSuggestionsEl = document.getElementById('destSuggestions');

    let suggestionTimeout = null;

    const stored = localStorage.getItem(AUTO_TOGGLE_KEY);
    const autoEnabled = stored === null ? true : (stored === 'true');
    if (stored === null) {
        localStorage.setItem(AUTO_TOGGLE_KEY, 'true');
    }
    if (autoToggleEl) {
        autoToggleEl.checked = autoEnabled;
        autoToggleEl.addEventListener('change', (e) => {
            const value = e.target.checked;
            localStorage.setItem(AUTO_TOGGLE_KEY, value ? 'true' : 'false');
            if (value) {
                currentConfig.to = { id: VICHY, name: 'Vichy' };
            } else {
                currentConfig.to = null;
            }
            updateDestVisibility();
            fetchAndRender();
        });
    }

    if (destBtnEl) destBtnEl.addEventListener('click', async () => {
        const raw = (destInputEl && destInputEl.value || '').trim();
        const board = document.getElementById('board');
        if (!raw) {
            renderMessage(board, 'Veuillez saisir une destination.');
            return;
        }
        const found = await lookupStopArea(raw);
        if (found && found.id) {
            currentConfig.to = { id: found.id, name: found.name };
            currentConfig.label = buildRouteLabel();
            fetchAndRender();
            return;
        }
        if (raw.toLowerCase().includes('vich')) {
            currentConfig.to = { id: VICHY, name: 'Vichy' };
            fetchAndRender();
            return;
        }
        if (raw.toLowerCase().includes('germain') || raw.toLowerCase().includes('saint') || raw.toLowerCase().includes('st ')) {
            currentConfig.to = { id: ST_GERMAIN, name: 'St-Germain' };
            fetchAndRender();
            return;
        }
        renderMessage(board, 'Destination non reconnue. Choisissez une gare valide dans les suggestions.');
    });

    if (destInputEl) {
        destInputEl.addEventListener('input', () => {
            const raw = destInputEl.value.trim();
            clearDestinationSuggestions(destSuggestionsEl);
            if (!raw) return;
            if (suggestionTimeout) clearTimeout(suggestionTimeout);
            suggestionTimeout = setTimeout(async () => {
                const items = await searchPlaces(raw, 8);
                renderDestinationSuggestions(destSuggestionsEl, items, (item) => {
                    destInputEl.value = item.name;
                    currentConfig.to = { id: item.id, name: item.name };
                    currentConfig.label = buildRouteLabel();
                    clearDestinationSuggestions(destSuggestionsEl);
                    fetchAndRender();
                });
            }, 250);
        });

        destInputEl.addEventListener('blur', () => {
            window.setTimeout(() => clearDestinationSuggestions(destSuggestionsEl), 150);
        });
    }
}

function updateDestVisibility() {
    const autoToggleEl = document.getElementById('autoToggle');
    const destInputEl = document.getElementById('destInput');
    const destBtnEl = document.getElementById('destBtn');
    const autoOn = (autoToggleEl && autoToggleEl.checked) || (localStorage.getItem(AUTO_TOGGLE_KEY) === 'true');
    const show = !autoOn;
    if (destInputEl) destInputEl.style.display = show ? '' : 'none';
    if (destBtnEl) destBtnEl.style.display = show ? '' : 'none';
}

function applyAutoDestination() {
    const autoOn = (localStorage.getItem(AUTO_TOGGLE_KEY) === 'true');
    if (autoOn) {
        if (currentConfig.from.id === ST_GERMAIN) {
            currentConfig.to = { id: VICHY, name: 'Vichy' };
            currentConfig.label = 'St-Germain ➔ Vichy';
        } else {
            currentConfig.to = { id: ST_GERMAIN, name: 'St-Germain' };
            currentConfig.label = 'Vichy ➔ St-Germain';
        }
    } else {
        currentConfig.to = null;
        currentConfig.label = (currentConfig.from.id === ST_GERMAIN) ? 'St-Germain — Choisir destination' : 'Vichy — Choisir destination';
    }
}

function initTransit() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            const LAT_ST_GERMAIN = 46.2019;
            const LON_ST_GERMAIN = 3.4288;
            const LAT_VICHY = 46.1244;
            const LON_VICHY = 3.4275;
            const distToStGermain = getDistance(userLat, userLon, LAT_ST_GERMAIN, LON_ST_GERMAIN);
            const distToVichy = getDistance(userLat, userLon, LAT_VICHY, LON_VICHY);
            currentConfig.from.id = distToVichy < distToStGermain ? VICHY : ST_GERMAIN;
            applyAutoDestination();
            fetchAndRender();
        }, () => {
            currentConfig.from.id = ST_GERMAIN;
            applyAutoDestination();
            fetchAndRender();
        }, { timeout: 5000 });
    } else {
        fetchAndRender();
    }
}

function registerSW() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(() => { });
        });
    }
}

async function start() {
    if (!API_KEY || API_KEY === 'REPLACE_ME') {
        const board = document.getElementById('board');
        board.innerHTML = '<div class="loader accent">Veuillez insérer votre clé API via VITE_SNCF_API_KEY.</div>';
        return;
    }
    initControls();
    updateDestVisibility();
    currentConfig.label = buildRouteLabel();
    updateRouteDisplay();
    registerSW();
    await initTransit();
}

start();
