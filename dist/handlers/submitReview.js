"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitReviewHandler = submitReviewHandler;
const pg_1 = require("pg");
const db_config_1 = require("../config/db.config");
const user_service_1 = require("../services/user.service");
const booking_service_1 = require("../services/booking.service");
const review_service_1 = require("../services/review.service");
const pool = new pg_1.Pool(db_config_1.dbConfig);
const userService = new user_service_1.UserService(pool);
const bookingService = new booking_service_1.BookingService(pool);
const reviewService = new review_service_1.ReviewService(pool);
async function submitReviewHandler(event) {
    if (!event.headers.Authorization || !event.body) {
        return { statusCode: 401, body: JSON.stringify({ message: "Autorización o cuerpo de solicitud requeridos." }) };
    }
    let payload;
    try {
        payload = userService.verifyToken(event.headers.Authorization);
        if (payload.userType !== 'client') {
            return { statusCode: 403, body: JSON.stringify({ message: "Solo Clientes pueden dejar reviews." }) };
        }
    }
    catch (error) {
        return { statusCode: 401, body: JSON.stringify({ message: "Token inválido o expirado." }) };
    }
    const clientId = payload.userId;
    const { bookingId, rating, comment } = JSON.parse(event.body);
    if (!bookingId || rating === undefined || typeof rating !== 'number') {
        return { statusCode: 400, body: JSON.stringify({ message: "ID de reserva y calificación (1-5) son obligatorios." }) };
    }
    try {
        const { sitter_id } = await bookingService.validateReviewEligibility(bookingId, clientId);
        const review = await reviewService.submitReview(sitter_id, clientId, bookingId, rating, comment);
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: "Review registrada exitosamente.",
                reviewId: review.review_id,
                rating: review.rating
            })
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al procesar la review.";
        return { statusCode: 403, body: JSON.stringify({ message: errorMessage }) };
    }
}
