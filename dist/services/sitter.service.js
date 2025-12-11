"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SitterService = void 0;
const uuid_1 = require("uuid");
class SitterService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async createService(serviceData) {
        const { sitter_id, service_type, price_ars, description = null } = serviceData;
        if (!sitter_id || !service_type || price_ars === undefined || price_ars < 0) {
            throw new Error("Datos de servicio incompletos o inválidos.");
        }
        const query = `
            INSERT INTO services (service_id, sitter_id, service_type, price_ars, description)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [(0, uuid_1.v4)(), sitter_id, service_type, price_ars, description];
        try {
            const result = await this.pool.query(query, values);
            return result.rows[0];
        }
        catch (error) {
            console.error("Error al crear servicio:", error);
            // CORRECCION 1: Cast de error a 'any' para leer .code
            const pgError = error;
            if (pgError.code === '23505') {
                throw new Error(`El Sitter ya ofrece el servicio: ${service_type}. Use la función de actualización.`);
            }
            throw new Error("Fallo en la base de datos al crear el servicio.");
        }
    }
    // CORRECCION 2: Permitir null en transactionId
    async processPaymentSimulation(bookingId, amount) {
        console.log(`[PAYMENT GATEWAY] Iniciando simulación de pago para Reserva ID: ${bookingId}, Monto: ARS ${amount.toFixed(2)}`);
        if (amount > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const transactionId = (0, uuid_1.v4)();
            console.log(`[PAYMENT GATEWAY] ✅ Pago exitoso. Transacción ID: ${transactionId}`);
            const updateQuery = `
                UPDATE bookings
                SET payment_status = 'PAID'
                WHERE booking_id = $1 AND payment_status = 'PENDING'
                RETURNING booking_id;
            `;
            await this.pool.query(updateQuery, [bookingId]);
            return {
                success: true,
                transactionId: transactionId
            };
        }
        else {
            console.log("[PAYMENT GATEWAY] ❌ Pago fallido (Monto inválido).");
            return {
                success: false,
                transactionId: null // Ahora esto es válido
            };
        }
    }
}
exports.SitterService = SitterService;
