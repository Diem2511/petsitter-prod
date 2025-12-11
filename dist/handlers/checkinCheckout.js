"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkinCheckoutHandler = checkinCheckoutHandler;
const pg_1 = require("pg");
const db_config_1 = require("../config/db.config");
const user_service_1 = require("../services/user.service");
const booking_service_1 = require("../services/booking.service");
const pool = new pg_1.Pool(db_config_1.dbConfig);
const userService = new user_service_1.UserService(pool);
const bookingService = new booking_service_1.BookingService(pool);
/**
 * Handler para que un Sitter realice Check-in (ACCEPTED -> ACTIVE) o Check-out (ACTIVE -> COMPLETED).
 * RUTA PROTEGIDA: Requiere JWT de un Sitter.
 */
async function checkinCheckoutHandler(event) {
    // 1. AUTORIZACIÓN (Verificar JWT y obtener sitterId)
    if (!event.headers.Authorization || !event.body) {
        return { statusCode: 401, body: JSON.stringify({ message: "Autorización o cuerpo de solicitud requeridos." }) };
    }
    let payload;
    try {
        payload = userService.verifyToken(event.headers.Authorization);
        if (payload.userType !== 'sitter') {
            return { statusCode: 403, body: JSON.stringify({ message: "Solo Sitters pueden realizar check-in/check-out." }) };
        }
    }
    catch (error) {
        return { statusCode: 401, body: JSON.stringify({ message: "Token inválido o expirado." }) };
    }
    const sitterId = payload.userId;
    const { bookingId, action } = JSON.parse(event.body); // action: 'CHECK_IN' o 'CHECK_OUT'
    if (!bookingId || (action !== 'CHECK_IN' && action !== 'CHECK_OUT')) {
        return { statusCode: 400, body: JSON.stringify({ message: "ID de reserva y acción ('CHECK_IN' o 'CHECK_OUT') son obligatorios." }) };
    }
    try {
        let booking;
        if (action === 'CHECK_IN') {
            booking = await bookingService.updateBookingToActive(sitterId, bookingId);
        }
        else { // action === 'CHECK_OUT'
            booking = await bookingService.updateBookingToCompleted(sitterId, bookingId);
        }
        // En un sistema real, aquí se activaría el pago final/liberación de fondos al COMPLETED.
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Reserva ${bookingId} completó la acción ${action}. Nuevo estado: ${booking.status}.`,
                bookingId: booking.booking_id,
                status: booking.status
            })
        };
    }
    catch (error) {
        // Capturar errores de validación (acceso denegado, estado incorrecto)
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al procesar la acción.";
        return { statusCode: 403, body: JSON.stringify({ message: errorMessage }) };
    }
}
