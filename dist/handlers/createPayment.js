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
exports.createPaymentHandler = createPaymentHandler;
const db_config_1 = require("../config/db.config");
const user_service_1 = require("../services/user.service");
const payment_service_1 = require("../services/payment.service");
const pool = db_config_1.dbConfig.pool;
const userService = new user_service_1.UserService(pool);
const paymentService = new payment_service_1.PaymentService(pool);
// Usamos el pool directamente para verificar la reserva si es necesario, 
// o podríamos instanciar BookingService si quisiéramos validar estado.
function createPaymentHandler(event) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Auth
        if (!event.headers.Authorization || !event.body) {
            return { statusCode: 401, body: JSON.stringify({ message: "Auth requerida." }) };
        }
        let payload;
        try {
            payload = userService.verifyToken(event.headers.Authorization);
            if (payload.userType !== 'client') {
                return { statusCode: 403, body: JSON.stringify({ message: "Solo clientes pagan." }) };
            }
        }
        catch (error) {
            return { statusCode: 401, body: JSON.stringify({ message: "Token inválido." }) };
        }
        const { bookingId, amount, paymentMethod } = JSON.parse(event.body);
        if (!bookingId || !amount || !paymentMethod) {
            return { statusCode: 400, body: JSON.stringify({ message: "Faltan datos (bookingId, amount, paymentMethod)." }) };
        }
        try {
            // En un flujo real, aquí verificaríamos que la reserva pertenezca al cliente.
            const payment = yield paymentService.processPayment(bookingId, parseFloat(amount), paymentMethod);
            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: "Pago procesado exitosamente.",
                    paymentId: payment.payment_id,
                    status: payment.status
                })
            };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : "Error desconocido.";
            return { statusCode: 500, body: JSON.stringify({ message: msg }) };
        }
    });
}
