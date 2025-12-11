// src/services/search.service.ts
import { Pool } from 'pg';
import { IcvService } from './icv.service'; // CORRECCIÓN: IcvService (Minúscula 'i')

interface SitterMatchResult {
    user_id: string;
    first_name: string;
    email: string;
    kyc_status: string;
    latitude: number;
    longitude: number;
    distance_km: number;
    avg_rating: number;
    icv_score: number;
}

export class SearchService {
    constructor(private pool: Pool, private icvService: IcvService) {} 
    
    public async searchSitters(
        clientLat: number, 
        clientLon: number, 
        maxDistanceKM: number,
        limit: number = 100
    ): Promise<SitterMatchResult[]> {
        const query = `
            SELECT 
                u.user_id, u.first_name, u.email, u.kyc_status, u.latitude, u.longitude,
                (6371 * acos(
                    cos(radians($1)) * cos(radians(u.latitude::double precision)) * cos(radians(u.longitude::double precision) - radians($2))
                    + sin(radians($1)) * sin(radians(u.latitude::double precision))
                )) AS distance_km,
                COALESCE(r.avg_rating, 0)::numeric(2,1) AS avg_rating
            FROM users u
            LEFT JOIN (
                SELECT sitter_id, AVG(rating) AS avg_rating
                FROM reviews
                GROUP BY sitter_id
            ) r ON u.user_id = r.sitter_id
            WHERE u.user_type = 'sitter' AND u.kyc_status IN ('KYC_VERIFIED', 'KYC_PENDING')
            HAVING (6371 * acos(
                    cos(radians($1)) * cos(radians(u.latitude::double precision)) * cos(radians(u.longitude::double precision) - radians($2))
                    + sin(radians($1)) * sin(radians(u.latitude::double precision))
                )) <= $3
            ORDER BY distance_km
            LIMIT $4;
        `;

        const result = await this.pool.query(query, [clientLat, clientLon, maxDistanceKM, limit]);
        
        const sittersWithIcv = await Promise.all(result.rows.map(async (row) => {
            const icvScore = await this.icvService.calculateIcvScore(
                row.user_id,
                parseFloat(row.distance_km),
                row.kyc_status,
                parseFloat(row.avg_rating)
            );
            return {
                ...row,
                icv_score: icvScore,
                distance_km: parseFloat(row.distance_km).toFixed(3)
            };
        }));

        sittersWithIcv.sort((a, b) => b.icv_score - a.icv_score);
        return sittersWithIcv;
    }
}
