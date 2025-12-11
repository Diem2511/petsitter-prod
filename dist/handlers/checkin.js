"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkinHandler = checkinHandler;
const pg_1 = require("pg");
const db_config_1 = require("../config/db.config");
const geo_service_1 = require("../services/geo.service");
const user_service_1 = require("../services/user.service"); // Para validación JWT
const pool = new pg_1.Pool(db_config_1.dbConfig);
const geoService = new geo_service_1.GeoService();
const userService = new user_service_1.UserService(pool);
// Coordenadas de prueba para el lugar de servicio (Simulación de la ubicación de la reserva)
const BOOKING_SERVICE_LAT = -31.4201; // Latitud de Córdoba, Argentina
const BOOKING_SERVICE_LON = -64.1887; // Longitud de Córdoba, Argentina
/**
 * Handler para validar la posición del Sitter al momento de realizar el check-in de un servicio.
 * RUTA PROTEGIDA: Requiere JWT de un Sitter.
 */
async function checkinHandler(event) {
    // 1. AUTORIZACIÓN (Verificar JWT)
    if (!event.headers.Authorization) {
        return { statusCode: 401, body: JSON.stringify({ message: "Autorización requerida." }) };
    }
    try {
        const payload = userService.verifyToken(event.headers.Authorization);
        // La validación de check-in solo la pueden realizar los Sitters
        if (payload.userType !== 'sitter') {
            return { statusCode: 403, body: JSON.stringify({ message: "Acceso denegado: Solo Sitters pueden realizar check-in." }) };
        }
    }
    catch (error) {
        return { statusCode: 401, body: JSON.stringify({ message: "Token inválido o expirado." }) };
    }
    // 2. LÓGICA DE GEOLOCALIZACIÓN
    try {
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ message: "Debe proporcionar latitud y longitud." }) };
        }
        const { latitude, longitude } = JSON.parse(event.body);
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return { statusCode: 400, body: JSON.stringify({ message: "Coordenadas inválidas." }) };
        }
        // Simulación: Obtener ubicación del servicio (en una app real, se obtendría de la tabla bookings)
        const serviceLocation = { lat: BOOKING_SERVICE_LAT, lon: BOOKING_SERVICE_LON };
        const { isWithinArea, distance } = geoService.isWithinServiceArea(latitude, longitude, serviceLocation.lat, serviceLocation.lon);
        if (isWithinArea) {
            // En un app real: Actualizar estado de la reserva a 'IN_PROGRESS'
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "✅ Check-in exitoso. Dentro de la zona de servicio.",
                    status: "IN_PROGRESS",
                    distance_km: distance
                })
            };
        }
        else {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    message: `❌ Check-in fallido. Fuera del área permitida. Distancia: ${distance} km.`,
                    status: "BLOCKED",
                    distance_km: distance
                })
            };
        }
    }
    catch (error) {
        console.error("Error en checkinHandler:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error interno al procesar check-in." })
        };
    }
}
