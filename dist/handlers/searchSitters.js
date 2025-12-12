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
exports.searchSittersHandler = searchSittersHandler;
const pg_1 = require("pg");
const db_config_1 = require("../config/db.config");
const user_service_1 = require("../services/user.service");
const search_service_1 = require("../services/search.service");
const icv_service_1 = require("../services/icv.service");
const review_service_1 = require("../services/review.service");
const neo4j_service_1 = require("../services/neo4j.service");
const pool = new pg_1.Pool(db_config_1.dbConfig);
const userService = new user_service_1.UserService(pool);
// 1. Instanciamos dependencias en orden correcto
const reviewService = new review_service_1.ReviewService(pool);
const neo4jService = new neo4j_service_1.Neo4jService();
// 2. IcvService necesita Neo4j y Review
const icvService = new icv_service_1.IcvService(neo4jService, reviewService);
// 3. SearchService necesita Pool e IcvService
const searchService = new search_service_1.SearchService(pool, icvService);
function searchSittersHandler(event) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!event.headers.Authorization || !event.body) {
            return { statusCode: 401, body: JSON.stringify({ message: "Autorización requerida." }) };
        }
        let payload;
        try {
            payload = userService.verifyToken(event.headers.Authorization);
            if (payload.userType !== 'client') {
                return { statusCode: 403, body: JSON.stringify({ message: "Solo Clientes." }) };
            }
        }
        catch (error) {
            return { statusCode: 401, body: JSON.stringify({ message: "Token inválido." }) };
        }
        const { latitude, longitude, maxDistanceKM, limit } = JSON.parse(event.body);
        if (!latitude || !longitude) {
            return { statusCode: 400, body: JSON.stringify({ message: "Ubicación requerida." }) };
        }
        try {
            // CORRECCIÓN: El método en SearchService se llama "searchSitters", no "findAndRankSitters"
            const sitters = yield searchService.searchSitters(parseFloat(latitude), parseFloat(longitude), maxDistanceKM !== undefined ? parseFloat(maxDistanceKM) : 5, limit ? parseInt(limit) : 10);
            return {
                statusCode: 200,
                body: JSON.stringify(sitters)
            };
        }
        catch (error) {
            console.error("Error búsqueda:", error);
            return { statusCode: 500, body: JSON.stringify({ message: "Error interno." }) };
        }
    });
}
