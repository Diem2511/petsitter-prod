"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const uuid_1 = require("uuid");
const PLATFORM_FEE_PERCENTAGE = 0.10; // 10%
class PaymentService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Procesa un pago simulado para una reserva.
     */
    async processPayment(bookingId, amount, paymentMethod) {
        // ... (código existente)
        // 1. Validación básica
        if (amount <= 0) {
            throw new Error("El monto debe ser mayor a 0.");
        }
        const paymentId = (0, uuid_1.v4)();
        const status = 'COMPLETED'; // Simulamos éxito inmediato
        // 2. Insertar registro de pago y actualizar booking.mp_payment_id
        const query = `
            WITH P AS (
                INSERT INTO payments (payment_id, booking_id, amount, currency, payment_method, status, created_at)
                VALUES ($1, $2, $3, 'USD', $4, $5, NOW())
                RETURNING payment_id, amount
            )
            UPDATE bookings
            SET payment_status = $5,
                mp_payment_id = (SELECT payment_id FROM P)
            WHERE booking_id = $2
            RETURNING booking_id, mp_payment_id;
        `;
        try {
            const result = await this.pool.query(query, [paymentId, bookingId, amount, paymentMethod, status]);
            return {
                payment_id: paymentId,
                status: status,
                booking_id: bookingId
            };
        }
        catch (error) {
            console.error("Error procesando pago:", error);
            throw new Error("Error en la base de datos al procesar el pago.");
        }
    }
    /**
     * Calcula las ganancias totales, la comisión de la plataforma y el neto del Sitter.
     * @param sitterId ID del Sitter
     */
    async calculateSitterEarnings(sitterId) {
        // Consulta para sumar los montos de pagos completados asociados a las reservas del Sitter.
        const query = `
            SELECT
                SUM(p.amount) AS total_paid
            FROM payments p
            JOIN bookings b ON p.booking_id = b.booking_id
            WHERE b.sitter_id = $1
            AND p.status = 'COMPLETED';
        `;
        const result = await this.pool.query(query, [sitterId]);
        const totalPaid = parseFloat(result.rows[0].total_paid || 0);
        if (totalPaid === 0) {
            return { totalPaid: 0, platformFee: 0, sitterNet: 0 };
        }
        const platformFee = totalPaid * PLATFORM_FEE_PERCENTAGE;
        const sitterNet = totalPaid - platformFee;
        // Retornamos los valores redondeados a 2 decimales
        return {
            totalPaid: parseFloat(totalPaid.toFixed(2)),
            platformFee: parseFloat(platformFee.toFixed(2)),
            sitterNet: parseFloat(sitterNet.toFixed(2)),
        };
    }
}
exports.PaymentService = PaymentService;
