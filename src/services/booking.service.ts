// src/services/booking.service.ts
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'ACTIVE' | 'COMPLETED' | 'PAID';

interface BookingRequest {
    sitterId: string;
    petType: string;
    serviceType: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
}

interface Booking {
    booking_id: string;
    sitter_id: string;
    client_id: string;
    pet_type: string;
    service_type: string;
    start_time: Date;
    end_time: Date;
    total_price: number;
    status: BookingStatus;
}

export class BookingService {
    constructor(private pool: Pool) {}

    public async createBooking(clientId: string, data: BookingRequest): Promise<Booking> {
        const bookingId = uuidv4();
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
            const result = await this.pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error("Error al crear la reserva:", error);
            throw new Error("Fallo en la base de datos al crear la reserva.");
        }
    }

    public async updateBookingStatus(sitterId: string, bookingId: string, newStatus: 'ACCEPTED' | 'REJECTED'): Promise<Booking> {
        const checkQuery = 'SELECT status, sitter_id FROM bookings WHERE booking_id = $1';
        const checkResult = await this.pool.query(checkQuery, [bookingId]);

        if (checkResult.rows.length === 0) throw new Error("Reserva no encontrada.");
        const currentBooking = checkResult.rows[0];

        if (currentBooking.sitter_id !== sitterId) throw new Error("Acceso denegado: Solo el Sitter asignado puede modificar esta reserva.");
        if (currentBooking.status !== 'PENDING') throw new Error(`La reserva debe estar en estado PENDING para ser ${newStatus}.`);

        const updateQuery = 'UPDATE bookings SET status = $1 WHERE booking_id = $2 RETURNING *;';
        const updateResult = await this.pool.query(updateQuery, [newStatus, bookingId]);
        return updateResult.rows[0];
    }

    public async updateBookingToActive(sitterId: string, bookingId: string): Promise<Booking> {
        return this.transitionBookingStatus(sitterId, bookingId, 'ACCEPTED', 'ACTIVE', 'Check-in');
    }

    public async updateBookingToCompleted(sitterId: string, bookingId: string): Promise<Booking> {
        return this.transitionBookingStatus(sitterId, bookingId, 'ACTIVE', 'COMPLETED', 'Check-out');
    }

    public async getClientIdByBookingId(bookingId: string): Promise<string> {
        const result = await this.pool.query('SELECT client_id FROM bookings WHERE booking_id = $1', [bookingId]);
        if (result.rows.length === 0) throw new Error("Reserva no encontrada.");
        return result.rows[0].client_id;
    }

    // --- NUEVOS MÉTODOS DE CHECK-IN / CHECK-OUT ---
    public async sitterCheckIn(bookingId: string, sitterId: string, latitude: number, longitude: number): Promise<void> {
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
        const result = await this.pool.query(query, [bookingId, sitterId, latitude, longitude]);
        if (result.rows.length === 0) {
            throw new Error("Check-in fallido. Reserva no encontrada, ya iniciada o no eres el Sitter.");
        }
    }

    public async sitterCheckOut(bookingId: string, sitterId: string): Promise<void> {
        const query = `
            UPDATE bookings
            SET status = 'COMPLETED',
                check_out_time = NOW()
            WHERE booking_id = $1
              AND sitter_id = $2
              AND status = 'ACTIVE'
            RETURNING booking_id;
        `;
        const result = await this.pool.query(query, [bookingId, sitterId]);
        if (result.rows.length === 0) {
            throw new Error("Check-out fallido. Reserva no encontrada o no estaba en estado ACTIVE.");
        }
    }
    // ----------------------------------------------

    private async transitionBookingStatus(sitterId: string, bookingId: string, expectedStatus: BookingStatus, newStatus: BookingStatus, action: string): Promise<Booking> {
        const checkQuery = 'SELECT status, sitter_id FROM bookings WHERE booking_id = $1';
        const checkResult = await this.pool.query(checkQuery, [bookingId]);

        if (checkResult.rows.length === 0) throw new Error("Reserva no encontrada.");
        const currentBooking = checkResult.rows[0];

        if (currentBooking.sitter_id !== sitterId) throw new Error("Acceso denegado.");
        if (currentBooking.status !== expectedStatus) throw new Error(`${action} fallido: Estado incorrecto.`);

        const updateQuery = 'UPDATE bookings SET status = $1 WHERE booking_id = $2 RETURNING *;';
        const updateResult = await this.pool.query(updateQuery, [newStatus, bookingId]);
        return updateResult.rows[0];
    }

    public async validateReviewEligibility(bookingId: string, clientId: string): Promise<{ sitter_id: string, client_id: string }> {
        const query = `
            SELECT b.sitter_id, b.client_id, b.status, r.booking_id AS existing_review
            FROM bookings b
            LEFT JOIN reviews r ON b.booking_id = r.booking_id
            WHERE b.booking_id = $1;
        `;
        const result = await this.pool.query(query, [bookingId]);

        if (result.rows.length === 0) throw new Error("Reserva no encontrada.");
        const bookingInfo = result.rows[0];

        if (bookingInfo.client_id !== clientId) throw new Error("Acceso denegado.");
        if (bookingInfo.status !== 'COMPLETED') throw new Error("Reserva no completada.");
        if (bookingInfo.existing_review) throw new Error("Ya tiene review.");

        return { sitter_id: bookingInfo.sitter_id, client_id: bookingInfo.client_id };
    }
}
