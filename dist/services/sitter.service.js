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
exports.SitterService = void 0;
const uuid_1 = require("uuid");
class SitterService {
    constructor(pool) {
        this.pool = pool;
    }
    createService(serviceData) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const result = yield this.pool.query(query, values);
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
        });
    }
    // CORRECCION 2: Permitir null en transactionId
    processPaymentSimulation(bookingId, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[PAYMENT GATEWAY] Iniciando simulación de pago para Reserva ID: ${bookingId}, Monto: ARS ${amount.toFixed(2)}`);
            if (amount > 0) {
                yield new Promise(resolve => setTimeout(resolve, 500));
                const transactionId = (0, uuid_1.v4)();
                console.log(`[PAYMENT GATEWAY] ✅ Pago exitoso. Transacción ID: ${transactionId}`);
                const updateQuery = `
                UPDATE bookings
                SET payment_status = 'PAID'
                WHERE booking_id = $1 AND payment_status = 'PENDING'
                RETURNING booking_id;
            `;
                yield this.pool.query(updateQuery, [bookingId]);
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
        });
    }
}
exports.SitterService = SitterService;
