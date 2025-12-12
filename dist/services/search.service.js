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
exports.SearchService = void 0;
class SearchService {
    constructor(pool, icvService) {
        this.pool = pool;
        this.icvService = icvService;
    }
    searchSitters(clientLat_1, clientLon_1, maxDistanceKM_1) {
        return __awaiter(this, arguments, void 0, function* (clientLat, clientLon, maxDistanceKM, limit = 100) {
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
            const result = yield this.pool.query(query, [clientLat, clientLon, maxDistanceKM, limit]);
            const sittersWithIcv = yield Promise.all(result.rows.map((row) => __awaiter(this, void 0, void 0, function* () {
                const icvScore = yield this.icvService.calculateIcvScore(row.user_id, parseFloat(row.distance_km), row.kyc_status, parseFloat(row.avg_rating));
                return Object.assign(Object.assign({}, row), { icv_score: icvScore, distance_km: parseFloat(row.distance_km).toFixed(3) });
            })));
            sittersWithIcv.sort((a, b) => b.icv_score - a.icv_score);
            return sittersWithIcv;
        });
    }
}
exports.SearchService = SearchService;
