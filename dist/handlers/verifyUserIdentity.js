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
exports.verifyUserIdentityHandler = verifyUserIdentityHandler;
const pg_1 = require("pg");
const db_config_1 = require("../config/db.config");
const user_service_1 = require("../services/user.service");
const kyc_service_1 = require("../services/kyc.service");
const pool = new pg_1.Pool(db_config_1.dbConfig);
const userService = new user_service_1.UserService(pool);
const kycService = new kyc_service_1.KYCService(pool);
/**
 * Handler para que un Sitter registre la verificación de identidad (KYC).
 * RUTA PROTEGIDA: Solo para usuarios logueados.
 */
function verifyUserIdentityHandler(event) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!event.headers.Authorization || !event.body) {
            return { statusCode: 401, body: JSON.stringify({ message: "Auth requerida." }) };
        }
        let payload;
        try {
            payload = userService.verifyToken(event.headers.Authorization);
        }
        catch (error) {
            return { statusCode: 401, body: JSON.stringify({ message: "Token inválido." }) };
        }
        const userId = payload.userId;
        const userType = payload.userType;
        const { validationToken } = JSON.parse(event.body);
        if (!validationToken) {
            return { statusCode: 400, body: JSON.stringify({ message: "El token de validación es obligatorio." }) };
        }
        // El KYCService se encargará de validar si el userType requiere KYC
        try {
            yield kycService.verifyUserIdentity(userId, userType, validationToken);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Identidad verificada exitosamente. Estado: VERIFIED.",
                    kycStatus: 'VERIFIED'
                })
            };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : "Error desconocido.";
            console.error("Error en la verificación KYC:", error);
            // Retornar 403 (Forbidden) si es un fallo de verificación
            if (msg.includes("fallida") || msg.includes("inválido")) {
                return { statusCode: 403, body: JSON.stringify({ message: msg, kycStatus: 'FAILED' }) };
            }
            return { statusCode: 500, body: JSON.stringify({ message: msg }) };
        }
    });
}
