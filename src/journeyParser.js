export function parseDirectJourneys(apiResponse) {
    const journeys = apiResponse.journeys || [];
    return journeys.map(journey => {
        const departureTime = journey.departure_date_time;
        const arrivalTime = journey.arrival_date_time;
        const transitSection = journey.sections.find(sec => sec.type === 'public_transport') || {};
        const baseDepartureTime = transitSection.base_departure_date_time || departureTime;
        const baseArrivalTime = transitSection.base_arrival_date_time || arrivalTime;
        const displayInfo = transitSection.display_informations || {};
        return {
            departureTime,
            baseDepartureTime,
            arrivalTime,
            direction: displayInfo.direction || 'Destination Inconnue',
            headsign: displayInfo.headsign || displayInfo.code || 'Numéro inconnu',
            commercialMode: `${displayInfo.commercial_mode || ''} ${displayInfo.headsign || ''}`.trim(),
            physicalMode: displayInfo.physical_mode || ''
        };
    }).filter(j => j.physicalMode.toLowerCase().indexOf('autocar') === -1 && j.physicalMode.toLowerCase().indexOf('bus') === -1);
}
