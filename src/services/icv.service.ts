// src/services/icv.service.ts
import { Neo4jService } from './neo4j.service';
import { ReviewService } from './review.service';

export class IcvService {
    // Inyectamos AMBOS servicios necesarios
    constructor(
        private neo4jService: Neo4jService, 
        private reviewService: ReviewService
    ) {}

    public async calculateIcvScore(sitterId: string, distanceKm: number, kycStatus: string, averageRating: number): Promise<number> {
        const MAX_KYC_SCORE = 40;
        const MAX_REPUTATION_SCORE = 40;
        const MAX_DISTANCE_SCORE = 10;
        const MAX_SOCIAL_SCORE = 10;

        let kycScore = 0;
        let reputationScore = 0;
        let distanceScore = 0;
        let socialScore = 0;

        // 1. KYC
        if (kycStatus === 'KYC_VERIFIED') {
            kycScore = MAX_KYC_SCORE;
        }

        // 2. Reputación
        if (averageRating) {
            reputationScore = (averageRating / 5.0) * MAX_REPUTATION_SCORE;
        }
        
        // 3. Distancia
        const MAX_KM = 5;
        if (distanceKm <= MAX_KM) {
            distanceScore = Math.max(0, MAX_DISTANCE_SCORE * (1 - (distanceKm / MAX_KM)));
        }

        // 4. Social (Usando el método que acabamos de definir en Neo4jService)
        const sitterIdSuffix = sitterId.slice(-4);
        // Nota: simulateSocialScore es sincrono en nuestra simulación, no requiere await, 
        // pero si fuera asíncrono se usaría await.
        socialScore = this.neo4jService.simulateSocialScore(sitterIdSuffix, MAX_SOCIAL_SCORE); 

        const totalScore = distanceScore + kycScore + socialScore + reputationScore;
        return parseFloat(totalScore.toFixed(1));
    }
}
