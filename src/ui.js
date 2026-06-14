import { getDisplayTime, getDisplayDate } from './utils.js';

export function renderLoading(boardEl, msg = 'Recherche...') {
    boardEl.innerHTML = `<div class="loader">${msg}</div>`;
}

export function renderError(boardEl, msg = 'Erreur réseau ou clé API invalide.') {
    boardEl.innerHTML = `<div class="loader error">${msg}</div>`;
}

export function renderMessage(boardEl, msg = 'Aucune donnée disponible.') {
    boardEl.innerHTML = `<div class="loader">${msg}</div>`;
}

export function renderJourneys(boardEl, departures, currentLabel) {
    boardEl.innerHTML = '';
    if (!departures || departures.length === 0) {
        boardEl.innerHTML = '<div class="loader">Aucun trajet trouvé.</div>';
        return;
    }
    let prevDateStr = '';
    departures.forEach(departure => {
        const dateStr = getDisplayDate(departure.departureTime);
        if (prevDateStr !== dateStr) {
            const dateLabel = document.createElement('div');
            dateLabel.className = 'date-label';
            dateLabel.innerHTML = `${dateStr}`;
            boardEl.appendChild(dateLabel);
        }
        prevDateStr = dateStr;
        const timeStr = departure.departureTime;
        const horaire = `${timeStr.substring(9, 11)}:${timeStr.substring(11, 13)}`;
        const num = departure.headsign || '--';
        const direction = departure.direction || '--';
        const baseTime = departure.baseDepartureTime;
        const amedTime = departure.departureTime;
        const isDelayed = baseTime !== amedTime;
        const arrivalTime = getDisplayTime(departure.arrivalTime);
        const card = document.createElement('div');
        card.className = 'journey-card';
        card.innerHTML = `
      <div class="time">${horaire}</div>
      <div class="details">
        <div class="type">n° ${num}</div>
        <div class="type">arrivée prévue à ${arrivalTime}</div>
        <div class="type">${direction}</div>
        ${isDelayed ? '<div class="status-delayed">Retardé</div>' : ''}
      </div>`;
        boardEl.appendChild(card);
    });
}

export function renderDestinationSuggestions(suggestionsEl, items, onSelect) {
    if (!suggestionsEl) return;
    suggestionsEl.innerHTML = '';
    if (!items || items.length === 0) {
        suggestionsEl.style.display = 'none';
        return;
    }
    items.forEach(item => {
        const option = document.createElement('div');
        option.className = 'suggestion-item';
        option.setAttribute('role', 'option');
        option.innerText = item.name || '';
        option.addEventListener('click', () => {
            onSelect && onSelect(item);
        });
        suggestionsEl.appendChild(option);
    });
    suggestionsEl.style.display = 'block';
}

export function clearDestinationSuggestions(suggestionsEl) {
    if (!suggestionsEl) return;
    suggestionsEl.innerHTML = '';
    suggestionsEl.style.display = 'none';
}
