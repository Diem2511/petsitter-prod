"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchHandler = void 0;
const db_config_1 = require("../config/db.config");
const geo_service_1 = require("../services/geo.service");
const pool = db_config_1.dbConfig.pool;
const searchHandler = (event) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { latitude, longitude, radius } = event.queryStringParameters || {};
        if (!latitude || !longitude) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Se requieren latitud y longitud." })
            };
        }
        const userLat = parseFloat(latitude);
        const userLon = parseFloat(longitude);
        const searchRadius = radius ? parseFloat(radius) : 10; // km por defecto
        // Obtenemos todos los sitters
        const query = "SELECT * FROM users WHERE user_type = 'sitter'";
        const result = yield pool.query(query);
        // Filtramos en código usando la función de geo.service
        const sitters = result.rows.map(sitter => {
            const dist = (0, geo_service_1.haversineDistance)(userLat, userLon, parseFloat(sitter.latitude || '0'), parseFloat(sitter.longitude || '0'));
            return Object.assign(Object.assign({}, sitter), { distance_km: dist });
        }).filter(sitter => sitter.distance_km <= searchRadius);
        return {
            statusCode: 200,
            body: JSON.stringify(sitters)
        };
    }
    catch (error) {
        console.error("Error en búsqueda:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error interno del servidor", error: error.message })
        };
    }
});
exports.searchHandler = searchHandler;
