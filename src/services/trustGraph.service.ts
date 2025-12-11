// src/services/trustGraph.service.ts
import { Pool } from 'pg';

const ICV_PONDERATION = {
    CONSORCIO_AVAL: 30, // Puntos por Aval de Consorcio/Administración
    VECINO_DIRECTO_AVAL: 20, // Puntos por Aval de Vecino Directo
    BASE_SCORE: 10, // Puntuación base por ser Sitter verificado (Simulación)
    DISTANCE_MAX_SCORE: 50 // Puntuación máxima por cercanía física
};

export class TrustGraphService {
    constructor(private pool: Pool) {}

    /**
     * Registra la ubicación inicial de un usuario (Sitter o Dueño).
     */
    public async setInitialLocation(userId: string, lat: number, lon: number, addressHash: string): Promise<void> {
        // En una app real, esto sincronizaría a Neo4j el nodo Persona y Direccion.
        await this.pool.query(
            'INSERT INTO user_locations (user_id, latitude, longitude, address_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude',
            [userId, lat, lon, addressHash]
        );
    }

    /**
     * Registra un aval de confianza.
     */
    public async addTrustAval(sitterId: string, validatorId: string, avalType: 'CONSORCIO' | 'VECINO_DIRECTO'): Promise<void> {
        // Esto crearía la relación [:AVALA_A] en Neo4j.
        await this.pool.query(
            'INSERT INTO user_trust_avals (sitter_id, validator_id, aval_type) VALUES ($1, $2, $3) ON CONFLICT (sitter_id, validator_id) DO NOTHING',
            [sitterId, validatorId, avalType]
        );
    }

    /**
     * ALGORITMO DE ÍNDICE DE CONFIANZA VECINAL (ICV)
     * 1. Encuentra Sitters
     * 2. Calcula score por Avales (Vecindad Lógica)
     * 3. Calcula score por Distancia (Vecindad Física)
     * 4. Devuelve ranking.
     * @param clientId El Dueño que busca Sitters.
     */
    public async getSitterRecommendations(clientId: string): Promise<any[]> {
        // 1. Obtener la ubicación del cliente
        const clientLocResult = await this.pool.query('SELECT latitude, longitude, address_hash FROM user_locations WHERE user_id = $1', [clientId]);
        if (clientLocResult.rows.length === 0) {
            throw new Error("Ubicación del cliente no registrada. ICV no puede calcularse.");
        }
        const clientLoc = clientLocResult.rows[0];

        // 2. Consulta compleja que junta Sitters, Avales y Ubicaciones
        // NOTA: Esta query SQL simula la complejidad y las uniones que haría un Cypher Query.
        const query = `
            SELECT
                u.user_id AS sitter_id,
                u.email, -- Solo para el test
                ul.latitude AS sitter_lat,
                ul.longitude AS sitter_lon,
                ul.address_hash AS sitter_hash,

                -- 2.1. Cálculo de Score por Avales (Lógica)
                COALESCE(SUM(CASE
                    WHEN a.aval_type = 'CONSORCIO' THEN ${ICV_PONDERATION.CONSORCIO_AVAL}
                    WHEN a.aval_type = 'VECINO_DIRECTO' THEN ${ICV_PONDERATION.VECINO_DIRECTO_AVAL}
                    ELSE 0
                END), 0) AS aval_score,
                
                -- 2.2. Cálculo de Score Base
                ${ICV_PONDERATION.BASE_SCORE} AS base_score
                
            FROM users u
            JOIN user_locations ul ON u.user_id = ul.user_id
            LEFT JOIN user_trust_avals a ON u.user_id = a.sitter_id
            WHERE u.user_type = 'sitter'
            GROUP BY u.user_id, ul.latitude, ul.longitude, ul.address_hash
            ORDER BY aval_score DESC;
        `;
        
        const result = await this.pool.query(query);

        // 3. Cálculo de Score por Distancia (Física) y Ponderación Final
        const recommendations = result.rows.map(row => {
            const { sitter_id, sitter_lat, sitter_lon, aval_score, base_score } = row;
            
            // Simulación de Cálculo de Distancia (Fórmula de Haversine simplificada)
            // Se usa un mock de la distancia para simular la ponderación
            const distanceKM = this.calculateDistance(parseFloat(clientLoc.latitude), parseFloat(clientLoc.longitude), parseFloat(sitter_lat), parseFloat(sitter_lon));
            
            // Puntuación de Distancia: 50 pts si está muy cerca (0 km) -> 0 pts si está lejos (ej. > 5km)
            const distanceScore = Math.max(0, ICV_PONDERATION.DISTANCE_MAX_SCORE * (1 - (distanceKM / 5)));
            
            // Puntuación ICV Final
            const finalICV = base_score + parseFloat(aval_score) + distanceScore;

            return {
                sitterId: sitter_id,
                distanceKM: parseFloat(distanceKM.toFixed(2)),
                avalScore: parseFloat(aval_score),
                distanceScore: parseFloat(distanceScore.toFixed(2)),
                finalICV: parseFloat(finalICV.toFixed(2)),
            };
        });
        
        // 4. Devolver ordenado por ICV
        return recommendations.sort((a, b) => b.finalICV - a.finalICV);
    }
    
    /**
     * Fórmula de Haversine para simular la distancia entre dos puntos (en km).
     */
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; 
    }

    private deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }
}
