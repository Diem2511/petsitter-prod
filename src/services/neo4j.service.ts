// src/services/neo4j.service.ts
import { driver, auth, Driver } from 'neo4j-driver';

export class Neo4jService {
    private driver: Driver;

    constructor() {
        // Mock connection for now or real env variables
        this.driver = driver(
            process.env.NEO4J_URI || 'bolt://localhost:7687',
            auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password')
        );
    }

    /**
     * Simula un puntaje social basado en el ID del sitter.
     * En producción, esto sería una consulta Cypher real.
     */
    public simulateSocialScore(sitterIdSuffix: string, maxScore: number): number {
        // Simulación: Si el ID termina en número par, da buen puntaje.
        const num = parseInt(sitterIdSuffix, 16); 
        if (isNaN(num)) return 0;
        return (num % 2 === 0) ? maxScore : maxScore / 2;
    }

    public async close() {
        await this.driver.close();
    }
}
