"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSitterRecommendationsHandler = getSitterRecommendationsHandler;
const pg_1 = require("pg");
const db_config_1 = require("../config/db.config");
const user_service_1 = require("../services/user.service");
const trustGraph_service_1 = require("../services/trustGraph.service");
const pool = new pg_1.Pool(db_config_1.dbConfig);
const userService = new user_service_1.UserService(pool);
const trustGraphService = new trustGraph_service_1.TrustGraphService(pool);
/**
 * Handler para obtener Sitters recomendados, ordenados por Índice de Confianza Vecinal (ICV).
 */
async function getSitterRecommendationsHandler(event) {
    // 1. Auth (Solo clientes buscan Sitters)
    if (!event.headers.Authorization) {
        return { statusCode: 401, body: JSON.stringify({ message: "Auth requerida." }) };
    }
    let payload;
    try {
        payload = userService.verifyToken(event.headers.Authorization);
        if (payload.userType !== 'client') {
            return { statusCode: 403, body: JSON.stringify({ message: "Solo clientes pueden buscar Sitters." }) };
        }
    }
    catch (error) {
        return { statusCode: 401, body: JSON.stringify({ message: "Token inválido." }) };
    }
    const clientId = payload.userId;
    try {
        // 2. Calcular ICV y obtener ranking
        const recommendations = await trustGraphService.getSitterRecommendations(clientId);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Recomendaciones ICV obtenidas exitosamente.",
                recommendations
            })
        };
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : "Error desconocido.";
        console.error("Error al obtener recomendaciones:", error);
        return { statusCode: 500, body: JSON.stringify({ message: `Error en el motor ICV: ${msg}` }) };
    }
}
