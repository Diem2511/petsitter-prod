"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReviewHandler = createReviewHandler;
const pg_1 = require("pg");
const db_config_1 = require("../config/db.config");
const review_service_1 = require("../services/review.service");
const user_service_1 = require("../services/user.service");
const pool = new pg_1.Pool(db_config_1.dbConfig);
const reviewService = new review_service_1.ReviewService(pool);
const userService = new user_service_1.UserService(pool);
async function createReviewHandler(event) {
    if (!event.headers.Authorization || !event.body) {
        return { statusCode: 401, body: JSON.stringify({ message: "Autorización o cuerpo de solicitud requeridos." }) };
    }
    let payload;
    try {
        payload = userService.verifyToken(event.headers.Authorization);
        if (payload.userType !== 'client') {
            return { statusCode: 403, body: JSON.stringify({ message: "Solo Clientes pueden crear reviews." }) };
        }
    }
    catch (error) {
        return { statusCode: 401, body: JSON.stringify({ message: "Token inválido o expirado." }) };
    }
    const { sitterId, rating, comment } = JSON.parse(event.body);
    if (!sitterId || !rating) {
        return { statusCode: 400, body: JSON.stringify({ message: "Faltan campos obligatorios (sitterId, rating)." }) };
    }
    try {
        const reviewData = { sitterId, clientId: payload.userId, rating, comment };
        // LA LÍNEA QUE FALLÓ ANTES: Ahora usa el método corregido.
        const newReview = await reviewService.createReview(reviewData);
        return {
            statusCode: 201,
            body: JSON.stringify({ message: "Review creada exitosamente.", reviewId: newReview.review_id })
        };
    }
    catch (error) {
        console.error("Error al crear review:", error);
        return { statusCode: 500, body: JSON.stringify({ message: "Error interno al procesar la review." }) };
    }
}
