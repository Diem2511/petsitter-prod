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
exports.BookingService = void 0;
const uuid_1 = require("uuid");
class BookingService {
    constructor(pool) {
        this.pool = pool;
    }
    createBooking(clientId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const bookingId = (0, uuid_1.v4)();
            const startTime = new Date(data.startTime);
            const endTime = new Date(data.endTime);
            if (startTime >= endTime) {
                throw new Error("La hora de inicio debe ser anterior a la hora de finalización.");
            }
            const query = `
            INSERT INTO bookings (booking_id, sitter_id, client_id, pet_type, service_type, start_time, end_time, total_price, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
            RETURNING *;
        `;
            const values = [bookingId, data.sitterId, clientId, data.petType, data.serviceType, startTime, endTime, data.totalPrice];
            try {
                const result = yield this.pool.query(query, values);
                return result.rows[0];
            }
            catch (error) {
                console.error("Error al crear la reserva:", error);
                throw new Error("Fallo en la base de datos al crear la reserva.");
            }
        });
    }
    updateBookingStatus(sitterId, bookingId, newStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            const checkQuery = 'SELECT status, sitter_id FROM bookings WHERE booking_id = $1';
            const checkResult = yield this.pool.query(checkQuery, [bookingId]);
            if (checkResult.rows.length === 0)
                throw new Error("Reserva no encontrada.");
            const currentBooking = checkResult.rows[0];
            if (currentBooking.sitter_id !== sitterId)
                throw new Error("Acceso denegado: Solo el Sitter asignado puede modificar esta reserva.");
            if (currentBooking.status !== 'PENDING')
                throw new Error(`La reserva debe estar en estado PENDING para ser ${newStatus}.`);
            const updateQuery = 'UPDATE bookings SET status = $1 WHERE booking_id = $2 RETURNING *;';
            const updateResult = yield this.pool.query(updateQuery, [newStatus, bookingId]);
            return updateResult.rows[0];
        });
    }
    updateBookingToActive(sitterId, bookingId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.transitionBookingStatus(sitterId, bookingId, 'ACCEPTED', 'ACTIVE', 'Check-in');
        });
    }
    updateBookingToCompleted(sitterId, bookingId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.transitionBookingStatus(sitterId, bookingId, 'ACTIVE', 'COMPLETED', 'Check-out');
        });
    }
    getClientIdByBookingId(bookingId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.pool.query('SELECT client_id FROM bookings WHERE booking_id = $1', [bookingId]);
            if (result.rows.length === 0)
                throw new Error("Reserva no encontrada.");
            return result.rows[0].client_id;
        });
    }
    // --- NUEVOS MÉTODOS DE CHECK-IN / CHECK-OUT ---
    sitterCheckIn(bookingId, sitterId, latitude, longitude) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
            UPDATE bookings
            SET status = 'ACTIVE',
                check_in_time = NOW(),
                check_in_location = POINT($3, $4)
            WHERE booking_id = $1
              AND sitter_id = $2
              AND status IN ('ACCEPTED', 'PAID') 
            RETURNING booking_id;
        `;
            const result = yield this.pool.query(query, [bookingId, sitterId, latitude, longitude]);
            if (result.rows.length === 0) {
                throw new Error("Check-in fallido. Reserva no encontrada, ya iniciada o no eres el Sitter.");
            }
        });
    }
    sitterCheckOut(bookingId, sitterId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
            UPDATE bookings
            SET status = 'COMPLETED',
                check_out_time = NOW()
            WHERE booking_id = $1
              AND sitter_id = $2
              AND status = 'ACTIVE'
            RETURNING booking_id;
        `;
            const result = yield this.pool.query(query, [bookingId, sitterId]);
            if (result.rows.length === 0) {
                throw new Error("Check-out fallido. Reserva no encontrada o no estaba en estado ACTIVE.");
            }
        });
    }
    // ----------------------------------------------
    transitionBookingStatus(sitterId, bookingId, expectedStatus, newStatus, action) {
        return __awaiter(this, void 0, void 0, function* () {
            const checkQuery = 'SELECT status, sitter_id FROM bookings WHERE booking_id = $1';
            const checkResult = yield this.pool.query(checkQuery, [bookingId]);
            if (checkResult.rows.length === 0)
                throw new Error("Reserva no encontrada.");
            const currentBooking = checkResult.rows[0];
            if (currentBooking.sitter_id !== sitterId)
                throw new Error("Acceso denegado.");
            if (currentBooking.status !== expectedStatus)
                throw new Error(`${action} fallido: Estado incorrecto.`);
            const updateQuery = 'UPDATE bookings SET status = $1 WHERE booking_id = $2 RETURNING *;';
            const updateResult = yield this.pool.query(updateQuery, [newStatus, bookingId]);
            return updateResult.rows[0];
        });
    }
    validateReviewEligibility(bookingId, clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
            SELECT b.sitter_id, b.client_id, b.status, r.booking_id AS existing_review
            FROM bookings b
            LEFT JOIN reviews r ON b.booking_id = r.booking_id
            WHERE b.booking_id = $1;
        `;
            const result = yield this.pool.query(query, [bookingId]);
            if (result.rows.length === 0)
                throw new Error("Reserva no encontrada.");
            const bookingInfo = result.rows[0];
            if (bookingInfo.client_id !== clientId)
                throw new Error("Acceso denegado.");
            if (bookingInfo.status !== 'COMPLETED')
                throw new Error("Reserva no completada.");
            if (bookingInfo.existing_review)
                throw new Error("Ya tiene review.");
            return { sitter_id: bookingInfo.sitter_id, client_id: bookingInfo.client_id };
        });
    }
}
exports.BookingService = BookingService;
