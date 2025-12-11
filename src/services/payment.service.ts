// src/services/payment.service.ts
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const PLATFORM_FEE_PERCENTAGE = 0.10; // 10%

export class PaymentService {
    constructor(private pool: Pool) {}

    /**
     * Procesa un pago simulado para una reserva.
     */
    public async processPayment(bookingId: string, amount: number, paymentMethod: string): Promise<any> {
        // ... (código existente)
        // 1. Validación básica
        if (amount <= 0) {
            throw new Error("El monto debe ser mayor a 0.");
        }

        const paymentId = uuidv4();
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
        } catch (error) {
            console.error("Error procesando pago:", error);
            throw new Error("Error en la base de datos al procesar el pago.");
        }
    }

    /**
     * Calcula las ganancias totales, la comisión de la plataforma y el neto del Sitter.
     * @param sitterId ID del Sitter
     */
    public async calculateSitterEarnings(sitterId: string): Promise<{ totalPaid: number, platformFee: number, sitterNet: number }> {
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
