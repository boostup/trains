export function getDisplayTime(rawDate = "20260611T210000") {
    if (typeof rawDate !== 'string' || rawDate.length < 15) return '??:??';
    const hour = rawDate.substring(9, 11);
    const min = rawDate.substring(11, 13);
    return `${hour}:${min}`;
}

export function getDisplayDate(rawDate = "20260611T210000") {
    if (typeof rawDate !== 'string' || rawDate.length < 15) return 'Date invalide';
    const year = rawDate.substring(0, 4);
    const month = rawDate.substring(4, 6);
    const day = rawDate.substring(6, 8);
    const hour = rawDate.substring(9, 11);
    const min = rawDate.substring(11, 13);
    const sec = rawDate.substring(13, 15);
    const isoString = `${year}-${month}-${day}T${hour}:${min}:${sec}`;
    const dateObj = new Date(isoString);
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    let formattedDate = new Intl.DateTimeFormat('fr-FR', options).format(dateObj);
    return formattedDate.replace(/\b\w/g, char => char.toUpperCase());
}

export function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function getSncfDateTime() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}00`;
}
