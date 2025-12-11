import neo4j, { Driver } from 'neo4j-driver';
import * as dotenv from 'dotenv';

dotenv.config();

// --- PATRÓN SINGLETON PARA EL DRIVER ---
let driver: Driver | null = null;

export function getDriver(): Driver {
    if (!driver) {
        driver = neo4j.driver(
            process.env.NEO4J_URI || 'bolt://localhost:7687',
            neo4j.auth.basic(
                process.env.NEO4J_USER || 'neo4j',
                process.env.NEO4J_PASSWORD || 'petsitter123'
            )
        );
    }
    return driver;
}

export async function closeDriver() {
    if (driver) {
        await driver.close();
        driver = null;
    }
}

// --- FUNCIÓN REQUERIDA POR SEARCH.TS ---
export async function getTrustLevel(sourceId: string, targetId: string): Promise<number> {
    const driver = getDriver();
    const session = driver.session();

    // Lógica simplificada: Si hay relación directa TRUSTS, devuelve el nivel.
    // Si no, devuelve 0.0. (Aquí luego iría el algoritmo BFS/Dijkstra)
    const query = `
        MATCH (a:Person {id: $sourceId})-[r:TRUSTS]->(b:Person {id: $targetId})
        RETURN r.level AS level
    `;

    try {
        const result = await session.run(query, { sourceId, targetId });
        if (result.records.length > 0) {
            // Convertimos el numero de Neo4j a JS number
            return result.records[0].get('level'); 
        }
        return 0.0;
    } catch (error) {
        console.error("Error obteniendo Trust Level:", error);
        return 0.0; // Fallback seguro
    } finally {
        await session.close();
    }
}
