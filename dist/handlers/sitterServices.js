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
exports.createServiceHandler = createServiceHandler;
exports.processPaymentHandler = processPaymentHandler;
const sitter_service_1 = require("../services/sitter.service");
const db_config_1 = require("../config/db.config");
// Inicialización de la pool de PostgreSQL
const pool = db_config_1.dbConfig.pool;
const sitterService = new sitter_service_1.SitterService(pool);
/**
 * Handler para crear un nuevo servicio ofrecido por un Sitter.
 */
function createServiceHandler(event) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!event.body) {
                return { statusCode: 400, body: JSON.stringify({ message: "No se proporcionó cuerpo de solicitud." }) };
            }
            const data = JSON.parse(event.body);
            // Simulación: 'sitter_id' real de Roberto Gomez (sitter sin ICV)
            // En una app real, esto vendría del token de sesión.
            const sitter_id = data.sitter_id || '296057a6-68b2-4d7a-b15f-d2b56e63283a';
            const serviceData = {
                sitter_id: sitter_id,
                service_type: data.service_type,
                price_ars: data.price_ars,
                description: data.description
            };
            const newService = yield sitterService.createService(serviceData);
            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: "Servicio creado exitosamente.",
                    service: {
                        service_id: newService.service_id,
                        service_type: newService.service_type,
                        price_ars: newService.price_ars
                    }
                })
            };
        }
        catch (error) {
            console.error("Error en createServiceHandler:", error);
            let message = "Error interno del servidor.";
            if (error instanceof Error) {
                message = error.message;
            }
            return {
                statusCode: 500,
                body: JSON.stringify({ message: message })
            };
        }
    });
}
/**
 * Handler que simula el proceso de pago para una reserva.
 * En el mundo real, esto sería una ruta de webhook o un endpoint de confirmación.
 */
function processPaymentHandler(event) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!event.body) {
                return { statusCode: 400, body: JSON.stringify({ message: "No se proporcionó cuerpo de solicitud." }) };
            }
            const { booking_id, amount } = JSON.parse(event.body);
            if (!booking_id || amount === undefined || amount <= 0) {
                return { statusCode: 400, body: JSON.stringify({ message: "Datos de pago incompletos o inválidos (ID de reserva y monto requeridos)." }) };
            }
            const paymentResult = yield sitterService.processPaymentSimulation(booking_id, amount);
            if (paymentResult.success) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: "Pago simulado exitoso y reserva marcada como pagada.",
                        transactionId: paymentResult.transactionId
                    })
                };
            }
            else {
                return {
                    statusCode: 402, // 402 Payment Required (aunque es simulación)
                    body: JSON.stringify({ message: "Simulación de pago fallida." })
                };
            }
        }
        catch (error) {
            console.error("Error en processPaymentHandler:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Error interno del servidor al procesar el pago." })
            };
        }
    });
}
