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
exports.checkInOutHandler = checkInOutHandler;
const db_config_1 = require("../config/db.config");
const user_service_1 = require("../services/user.service");
const booking_service_1 = require("../services/booking.service");
const pool = db_config_1.dbConfig.pool;
const userService = new user_service_1.UserService(pool);
const bookingService = new booking_service_1.BookingService(pool);
/**
 * Handler para que el Sitter inicie (Check-in) o finalice (Check-out) una reserva.
 * RUTA PROTEGIDA: Solo para Sitters.
 */
function checkInOutHandler(event) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Auth y Sitter Check
        if (!event.headers.Authorization || !event.body) {
            return { statusCode: 401, body: JSON.stringify({ message: "Auth requerida." }) };
        }
        let payload;
        try {
            payload = userService.verifyToken(event.headers.Authorization);
            if (payload.userType !== 'sitter') {
                return { statusCode: 403, body: JSON.stringify({ message: "Acción solo para Sitters." }) };
            }
        }
        catch (error) {
            return { statusCode: 401, body: JSON.stringify({ message: "Token inválido." }) };
        }
        const sitterId = payload.userId;
        const { bookingId, action, latitude, longitude } = JSON.parse(event.body);
        if (!bookingId || (action !== 'CHECK_IN' && action !== 'CHECK_OUT')) {
            return { statusCode: 400, body: JSON.stringify({ message: "ID de reserva y acción ('CHECK_IN' o 'CHECK_OUT') son obligatorios." }) };
        }
        if (action === 'CHECK_IN' && (!latitude || !longitude)) {
            return { statusCode: 400, body: JSON.stringify({ message: "Latitude y Longitude son obligatorios para el Check-in." }) };
        }
        try {
            if (action === 'CHECK_IN') {
                yield bookingService.sitterCheckIn(bookingId, sitterId, parseFloat(latitude), parseFloat(longitude));
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Check-in registrado. Reserva en estado ACTIVE." })
                };
            }
            if (action === 'CHECK_OUT') {
                yield bookingService.sitterCheckOut(bookingId, sitterId);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Check-out registrado. Reserva en estado COMPLETED. Pago disparado." })
                };
            }
            return { statusCode: 400, body: JSON.stringify({ message: "Acción no válida." }) };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : "Error desconocido.";
            console.error(`Error en ${action}:`, error);
            return { statusCode: 403, body: JSON.stringify({ message: msg }) };
        }
    });
}
