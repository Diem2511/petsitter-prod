"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoService = void 0;
exports.haversineDistance = haversineDistance;
// Helper interno
function toRad(value) {
    return value * Math.PI / 180;
}
// EXPORTACIÓN 1: Función suelta (Necesaria para search.ts)
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio Tierra km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
}
// EXPORTACIÓN 2: Clase (Necesaria para checkin.ts)
class GeoService {
    // El argumento maxDistanceKm es OPCIONAL (= 1.0) para que no falle si no se envía
    isWithinServiceArea(currentLat, currentLon, targetLat, targetLon, maxDistanceKm = 1.0) {
        const dist = haversineDistance(currentLat, currentLon, targetLat, targetLon);
        return {
            isWithinArea: dist <= maxDistanceKm,
            distance: parseFloat(dist.toFixed(3))
        };
    }
}
exports.GeoService = GeoService;
