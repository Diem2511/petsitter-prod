"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jService = void 0;
// src/services/neo4j.service.ts
const neo4j_driver_1 = require("neo4j-driver");
class Neo4jService {
    driver;
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
    async close() {
        await this.driver.close();
    }
}
exports.Neo4jService = Neo4jService;
