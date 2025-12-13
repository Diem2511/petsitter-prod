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
exports.getSitterRecommendationsHandler = getSitterRecommendationsHandler;
const db_config_1 = require("../config/db.config");
const user_service_1 = require("../services/user.service");
const trustGraph_service_1 = require("../services/trustGraph.service");
const pool = db_config_1.dbConfig.pool;
const userService = new user_service_1.UserService(pool);
const trustGraphService = new trustGraph_service_1.TrustGraphService(pool);
/**
 * Handler para obtener Sitters recomendados, ordenados por Índice de Confianza Vecinal (ICV).
 */
function getSitterRecommendationsHandler(event) {
    return __awaiter(this, void 0, void 0, function* () {
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
            const recommendations = yield trustGraphService.getSitterRecommendations(clientId);
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
    });
}
