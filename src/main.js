import './style.css';
import { currentConfig } from './state.js';
import { DEFAULT_STATIONS, API_JOURNEYS_URL, API_PLACES_URL } from './constants.js';
import './components/search-settings/search-settings.js';
import './components/favorites-manager/favorites-manager.js';
import './components/journey-card/journey-card.js';
import './components/clear-button/clear-button.js';
import './components/auto-complete/auto-complete.js';
import './components/header-actions/header-actions.js';
import './components/refresh-button/refresh-button.js';
import './components/screen-manager/screen-manager.js';
import './components/settings-panel/settings-panel.js';
import { iconSun, iconMoon, iconStar } from './icons/index.js';
import { injectIcons } from './utils/icon-injector.js';
import { formatSncfClockTime, getFormattedDate, computeDuration, getHaversineDistance, parseJourneys } from './utils.js';

let suggestionTimeout = null;

function getApiKey() {
    return currentConfig.apiKey || '';
}

function dispatchNavigate(destination) {
    const manager = document.querySelector('screen-manager');
    if (manager) {
        manager.dispatchEvent(new CustomEvent('navigate-to', {
            detail: { destination },
            bubbles: true
        }));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    injectIcons();
    initTheme();

    const apiKey = getApiKey();
    if (!apiKey) {
        showApiKeyGate();
    } else {
        initMainApp();
    }
});

function showApiKeyGate() {
    dispatchNavigate('api-key');
    const input = document.getElementById('api-key-input');
    const submitBtn = document.getElementById('api-key-submit');
    const errorEl = document.getElementById('api-key-error');

    input.value = '';
    errorEl.style.display = 'none';

    const submitKey = () => {
        const key = input.value.trim();
        if (!key) {
            errorEl.style.display = 'block';
            return;
        }
        currentConfig.apiKey = key;
        errorEl.style.display = 'none';
        initMainApp();
    };

    submitBtn.addEventListener('click', submitKey);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitKey();
    });
    input.focus();
}

function initMainApp() {
    initAutocomplete();
    initApiKeySettings();

    const headerActions = document.querySelector('header-actions');
    const refreshBtn = document.getElementById('manual-refresh-btn');

    if (headerActions) {
        headerActions.addEventListener('favorite-click', () => {
            const currentRouteId = `${currentConfig.from.id}-${currentConfig.to.id}`;
            const isFav = currentConfig.favorites.some(f => `${f.from.id}-${f.to.id}` === currentRouteId);

            if (isFav) {
                currentConfig.favorites = currentConfig.favorites.filter(f => `${f.from.id}-${f.to.id}` !== currentRouteId);
            } else {
                const newFav = { from: currentConfig.from, to: currentConfig.to, label: currentConfig.label };
                currentConfig.favorites = [...currentConfig.favorites, newFav];
            }
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('refresh', () => {
            fetchSncbJourneys();
        });
    }

    window.addEventListener('app-state-changed', (e) => {
        const { property } = e.detail;

        if (property === 'from' || property === 'to' || property === 'autocarRoutesEnabled' || property === 'indirectRoutesEnabled') {
            fetchSncbJourneys();
        }
    });

    if (currentConfig.defaultRoute) {
        fetchSncbJourneys();
    } else {
        initGeolocationAndProximity();
    }

    dispatchNavigate('board');
}

function initApiKeySettings() {
    const settingsInput = document.getElementById('api-key-settings-input');
    const saveBtn = document.getElementById('api-key-settings-save');
    const clearBtn = document.getElementById('api-key-clear-btn');
    const msgEl = document.getElementById('api-key-settings-msg');

    const syncInput = () => {
        settingsInput.value = currentConfig.apiKey || '';
    };

    syncInput();

    const stateListener = () => syncInput();
    window.addEventListener('app-state-changed', stateListener);

    saveBtn.addEventListener('click', () => {
        const key = settingsInput.value.trim();
        if (!key) {
            msgEl.textContent = 'Veuillez entrer une clé API.';
            msgEl.className = 'key-settings-msg error';
            msgEl.style.display = 'block';
            return;
        }
        currentConfig.apiKey = key;
        msgEl.textContent = 'Clé API enregistrée avec succès.';
        msgEl.className = 'key-settings-msg success';
        msgEl.style.display = 'block';
    });

    clearBtn.addEventListener('click', () => {
        currentConfig.apiKey = '';
        settingsInput.value = '';
        msgEl.textContent = 'Clé API supprimée. L\'application sera inaccessible jusqu\'à ce qu\'une nouvelle clé soit fournie.';
        msgEl.className = 'key-settings-msg error';
        msgEl.style.display = 'block';
    });
}

function initGeolocationAndProximity() {
    const boardEl = document.getElementById('journeys-board');
    boardEl.innerHTML = '<div class="sys-msg">Calcul de la position GPS…</div>';

    if (!navigator.geolocation) {
        boardEl.innerHTML = `
            <div class="sys-msg" style="color: #ff5252;">
                La géolocalisation n'est pas supportée par votre navigateur.
                <br>Origine par défaut : St-Germain-des-Fossés.
                <br>Vous pouvez modifier gare de départ dans le champ de recherche.
            </div>`;
        currentConfig.from = DEFAULT_STATIONS.ST_GERMAIN;
        currentConfig.to = DEFAULT_STATIONS.VICHY;
        return;
    }

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
    };

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const uLat = position.coords.latitude;
            const uLon = position.coords.longitude;

            const distToStGermain = getHaversineDistance(uLat, uLon, DEFAULT_STATIONS.ST_GERMAIN.lat, DEFAULT_STATIONS.ST_GERMAIN.lon);
            const distToVichy = getHaversineDistance(uLat, uLon, DEFAULT_STATIONS.VICHY.lat, DEFAULT_STATIONS.VICHY.lon);

            if (distToVichy < distToStGermain) {
                currentConfig.from = DEFAULT_STATIONS.VICHY;
                currentConfig.to = DEFAULT_STATIONS.ST_GERMAIN;
            } else {
                currentConfig.from = DEFAULT_STATIONS.ST_GERMAIN;
                currentConfig.to = DEFAULT_STATIONS.VICHY;
            }
        },
        (error) => {
            let message = '';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message = 'La géolocalisation a été refusée. Veuillez l\'autoriser dans les paramètres de votre navigateur ou réessayer.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = 'La position GPS est indisponible. Vérifiez que les services de localisation sont activés.';
                    break;
                case error.TIMEOUT:
                    message = 'Le positionnement GPS a pris trop de temps. Réessayez en vous assurant que vous êtes près d\'une fenêtre.';
                    break;
                default:
                    message = 'Une erreur de géolocalisation est survenue.';
            }
            boardEl.innerHTML = `
                <div class="sys-msg" style="color: #ff5252;">
                    ${message}
                    <br><br>
                    <button id="retry-geolocation-btn" class="action-btn-accent">Réessayer</button>
                    <span style="margin-left: 8px;">— sinon, St-Germain-des-Fossés sera utilisé comme origine.</span>
                </div>`;
            currentConfig.from = DEFAULT_STATIONS.ST_GERMAIN;
            currentConfig.to = DEFAULT_STATIONS.VICHY;

            const retryBtn = document.getElementById('retry-geolocation-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', initGeolocationAndProximity);
            }
        },
        options
    );
}

async function fetchSncbJourneys() {
    const boardEl = document.getElementById('journeys-board');
    boardEl.innerHTML = '<div class="sys-msg">Recherche des trains...</div>';

    const apiKey = getApiKey();
    if (!apiKey) {
        boardEl.innerHTML = '<div class="sys-msg" style="color: #ff5252;">Clé API manquante. Veuillez la configurer dans les réglages.</div>';
        return;
    }

    const transfers = currentConfig.indirectRoutesEnabled ? 2 : 0;
    let url = `${API_JOURNEYS_URL}?from=${currentConfig.from.id}&to=${currentConfig.to.id}&max_nb_transfers=${transfers}&count=15`;

    if (!currentConfig.autocarRoutesEnabled) {
        url += '&forbidden_uris%5B%5D=physical_mode%3ACoach&forbidden_uris%5B%5D=physical_mode%3ABus';
    }

    try {
        const response = await fetch(url, { headers: { 'Authorization': apiKey } });
        if (!response.ok) throw new Error();
        const data = await response.json();
        const parsed = parseJourneys(data);
        displayJourneysBoard(parsed);
    } catch (e) {
        boardEl.innerHTML = '<div class="sys-msg" style="color: #ff5252;">Une erreur réseau est survenue. Veuillez réessayer.</div>';
    }
}

function displayJourneysBoard(departures, options = {}) {
    const boardEl = document.getElementById('journeys-board');
    boardEl.innerHTML = '';

    if (departures.length === 0) {
        boardEl.innerHTML = '<div class="sys-msg">Aucun itinéraire trouvé.</div>';
        return;
    }

    let lastHeaderDate = "";
    departures.forEach(item => {
        const readableDate = getFormattedDate(item.departureTime);
        if (lastHeaderDate !== readableDate) {
            const dateDivider = document.createElement('div');
            dateDivider.className = 'date-label';
            dateDivider.textContent = readableDate;
            boardEl.appendChild(dateDivider);
        }
        lastHeaderDate = readableDate;

        const clockDep = formatSncfClockTime(item.departureTime);
        const clockArr = formatSncfClockTime(item.arrivalTime);
        const duration = computeDuration(item.departureTime, item.arrivalTime);

        const card = document.createElement('journey-card');
        card.setAttribute('departure-time', clockDep);
        card.setAttribute('arrival-time', clockArr);
        card.setAttribute('duration', duration);
        card.setAttribute('headsign', item.headsign);
        card.setAttribute('direction', item.direction);
        card.setAttribute('is-autocar', item.isAutocar.toString());
        card.setAttribute('is-delayed', item.isDelayed.toString());
        boardEl.appendChild(card);
    });
}

function initAutocomplete() {
    const autoComplete = document.getElementById('dest-autocomplete');
    const okBtn = document.getElementById('search-action-btn');
    const clearBtn = document.getElementById('dest-clear-btn');

    autoComplete.addEventListener('item-selected', (e) => {
        currentConfig.to = { id: e.detail.id, name: e.detail.label };
    });

    autoComplete.addEventListener('query-changed', (e) => {
        const query = e.detail.value.trim();
        if (suggestionTimeout) clearTimeout(suggestionTimeout);
        if (query.length < 2) {
            autoComplete.items = [];
            return;
        }

        suggestionTimeout = setTimeout(async () => {
            const apiKey = getApiKey();
            if (!apiKey) {
                autoComplete.items = [];
                return;
            }

            const url = `${API_PLACES_URL}?q=${encodeURIComponent(query)}&type=stop_area&count=5`;
            try {
                const r = await fetch(url, { headers: { 'Authorization': apiKey } });
                const d = await r.json();
                const items = d.places || [];
                autoComplete.items = items.map(p => ({
                    id: p.id,
                    label: p.name || p.label
                }));
            } catch (e) {
                autoComplete.items = [];
            }
        }, 250);
    });

    okBtn.addEventListener('click', () => {
        autoComplete.items = [];
        fetchSncbJourneys();
    });

    clearBtn.addEventListener('click', () => {
        autoComplete.items = [];
    });
}

function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    const themeIconEl = document.querySelector('.settings-item-static .icon-placeholder[data-icon="sun"]');
    const userPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

    if (userPrefersLight) {
        document.documentElement.classList.add('light-theme');
        toggle.checked = false;
    } else {
        document.documentElement.classList.remove('light-theme');
        toggle.checked = true;
    }

    updateThemeIcon();

    toggle.addEventListener('change', () => {
        if (toggle.checked) {
            document.documentElement.classList.remove('light-theme');
        } else {
            document.documentElement.classList.add('light-theme');
        }
        updateThemeIcon();
    });

    function updateThemeIcon() {
        if (!themeIconEl) return;
        const isDark = document.documentElement.classList.contains('light-theme') === false;
        const size = parseInt(themeIconEl.dataset.size, 10) || 22;
        themeIconEl.innerHTML = isDark ? iconMoon({ size }) : iconSun({ size });
    }
}