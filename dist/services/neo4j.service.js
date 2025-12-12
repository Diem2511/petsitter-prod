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
exports.Neo4jService = void 0;
// src/services/neo4j.service.ts
const neo4j_driver_1 = require("neo4j-driver");
class Neo4jService {
    constructor() {
        // Mock connection for now or real env variables
        this.driver = (0, neo4j_driver_1.driver)(process.env.NEO4J_URI || 'bolt://localhost:7687', neo4j_driver_1.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password'));
    }
    /**
     * Simula un puntaje social basado en el ID del sitter.
     * En producción, esto sería una consulta Cypher real.
     */
    simulateSocialScore(sitterIdSuffix, maxScore) {
        // Simulación: Si el ID termina en número par, da buen puntaje.
        const num = parseInt(sitterIdSuffix, 16);
        if (isNaN(num))
            return 0;
        return (num % 2 === 0) ? maxScore : maxScore / 2;
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.driver.close();
        });
    }
}
exports.Neo4jService = Neo4jService;
