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
exports.ReviewService = void 0;
class ReviewService {
    constructor(pool) {
        this.pool = pool;
    }
    submitReview(sitterId, clientId, bookingId, rating, comment) {
        return __awaiter(this, void 0, void 0, function* () {
            if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
                throw new Error("La calificación debe ser un número entero entre 1 y 5.");
            }
            const query = `
            INSERT INTO reviews (sitter_id, client_id, booking_id, rating, comment)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
            const values = [sitterId, clientId, bookingId, rating, comment || null];
            try {
                const result = yield this.pool.query(query, values);
                return result.rows[0];
            }
            catch (error) {
                console.error("Error al registrar la review:", error);
                throw new Error("Fallo en la base de datos al registrar la review.");
            }
        });
    }
    getAverageRating(sitterId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT AVG(rating) as avg_rating FROM reviews WHERE sitter_id = $1`;
            try {
                const result = yield this.pool.query(query, [sitterId]);
                const avg = parseFloat(result.rows[0].avg_rating);
                return isNaN(avg) ? 0 : avg;
            }
            catch (error) {
                console.error("Error al obtener promedio de rating:", error);
                return 0;
            }
        });
    }
    getReviewsBySitter(sitterId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
            SELECT r.*, u.first_name as client_name 
            FROM reviews r
            JOIN users u ON r.client_id = u.user_id
            WHERE r.sitter_id = $1
            ORDER BY r.created_at DESC
        `;
            const result = yield this.pool.query(query, [sitterId]);
            return result.rows;
        });
    }
}
exports.ReviewService = ReviewService;
