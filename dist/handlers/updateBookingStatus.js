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
exports.updateBookingStatusHandler = updateBookingStatusHandler;
const pg_1 = require("pg");
const db_config_1 = require("../config/db.config");
const user_service_1 = require("../services/user.service");
const booking_service_1 = require("../services/booking.service");
const pool = new pg_1.Pool(db_config_1.dbConfig);
const userService = new user_service_1.UserService(pool);
const bookingService = new booking_service_1.BookingService(pool);
/**
 * Handler para que un Sitter acepte o rechace una reserva.
 * RUTA PROTEGIDA: Requiere JWT de un Sitter.
 */
function updateBookingStatusHandler(event) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. AUTORIZACIÓN (Verificar JWT y obtener sitterId)
        if (!event.headers.Authorization || !event.body) {
            return { statusCode: 401, body: JSON.stringify({ message: "Autorización o cuerpo de solicitud requeridos." }) };
        }
        let payload;
        try {
            payload = userService.verifyToken(event.headers.Authorization);
            if (payload.userType !== 'sitter') {
                return { statusCode: 403, body: JSON.stringify({ message: "Solo Sitters pueden aceptar/rechazar reservas." }) };
            }
        }
        catch (error) {
            return { statusCode: 401, body: JSON.stringify({ message: "Token inválido o expirado." }) };
        }
        const sitterId = payload.userId;
        const { bookingId, status } = JSON.parse(event.body);
        if (!bookingId || !status || (status !== 'ACCEPTED' && status !== 'REJECTED')) {
            return { statusCode: 400, body: JSON.stringify({ message: "ID de reserva y estado ('ACCEPTED' o 'REJECTED') son obligatorios." }) };
        }
        try {
            const booking = yield bookingService.updateBookingStatus(sitterId, bookingId, status);
            // En un sistema real, aquí se notificaría al Cliente.
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: `Reserva ${bookingId} actualizada a ${booking.status}.`,
                    bookingId: booking.booking_id,
                    status: booking.status
                })
            };
        }
        catch (error) {
            // Capturar errores de validación (acceso denegado, estado incorrecto)
            const errorMessage = error instanceof Error ? error.message : "Error desconocido al actualizar la reserva.";
            return { statusCode: 403, body: JSON.stringify({ message: errorMessage }) };
        }
    });
}
