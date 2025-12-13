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
exports.getSitterEarningsHandler = getSitterEarningsHandler;
const db_config_1 = require("../config/db.config");
const user_service_1 = require("../services/user.service");
const payment_service_1 = require("../services/payment.service");
const pool = db_config_1.dbConfig.pool;
const userService = new user_service_1.UserService(pool);
const paymentService = new payment_service_1.PaymentService(pool);
/**
 * Handler para obtener el resumen financiero de un Sitter.
 * RUTA PROTEGIDA: Solo para usuarios 'sitter'.
 */
function getSitterEarningsHandler(event) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Auth y Verificación de Tipo de Usuario
        if (!event.headers.Authorization) {
            return { statusCode: 401, body: JSON.stringify({ message: "Auth requerida." }) };
        }
        let payload;
        try {
            payload = userService.verifyToken(event.headers.Authorization);
            if (payload.userType !== 'sitter') {
                return { statusCode: 403, body: JSON.stringify({ message: "Acceso solo para Sitters." }) };
            }
        }
        catch (error) {
            return { statusCode: 401, body: JSON.stringify({ message: "Token inválido." }) };
        }
        const sitterId = payload.userId;
        try {
            // 2. Calcular Ganancias
            const earnings = yield paymentService.calculateSitterEarnings(sitterId);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Resumen de ganancias obtenido exitosamente.",
                    sitterId,
                    earnings
                })
            };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : "Error desconocido.";
            console.error("Error al obtener ganancias:", error);
            return { statusCode: 500, body: JSON.stringify({ message: `Error interno: ${msg}` }) };
        }
    });
}
