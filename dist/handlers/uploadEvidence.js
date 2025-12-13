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
exports.uploadEvidenceHandler = uploadEvidenceHandler;
const db_config_1 = require("../config/db.config");
const user_service_1 = require("../services/user.service");
const file_service_1 = require("../services/file.service");
const pool = db_config_1.dbConfig.pool;
const userService = new user_service_1.UserService(pool);
const fileService = new file_service_1.FileService(pool);
/**
 * Handler para que el Sitter suba evidencia fotográfica del servicio.
 * RUTA PROTEGIDA: Solo para Sitters.
 */
function uploadEvidenceHandler(event) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Auth y Verificación de Sitter
        if (!event.headers.Authorization || !event.body) {
            return { statusCode: 401, body: JSON.stringify({ message: "Auth requerida." }) };
        }
        let payload;
        try {
            payload = userService.verifyToken(event.headers.Authorization);
            if (payload.userType !== 'sitter') {
                return { statusCode: 403, body: JSON.stringify({ message: "Acción solo para Sitters." }) };
            }
        }
        catch (error) {
            return { statusCode: 401, body: JSON.stringify({ message: "Token inválido." }) };
        }
        const sitterId = payload.userId;
        const { bookingId, fileData, mimeType, latitude, longitude } = JSON.parse(event.body);
        if (!bookingId || !fileData || !mimeType || !latitude || !longitude) {
            return { statusCode: 400, body: JSON.stringify({ message: "Datos faltantes: bookingId, fileData, mimeType, latitude, longitude." }) };
        }
        // Validar tipo de archivo (ejemplo básico)
        if (!mimeType.startsWith('image/')) {
            return { statusCode: 400, body: JSON.stringify({ message: "Tipo de archivo no soportado." }) };
        }
        try {
            // 2. Subir a S3 (Simulado) y registrar metadatos
            const result = yield fileService.uploadEvidence(sitterId, bookingId, fileData, mimeType, parseFloat(latitude), parseFloat(longitude));
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Evidencia subida exitosamente.",
                    evidenceId: result.evidenceId,
                    fileUrl: result.fileUrl // URL con marca de agua (coordenadas/timestamp)
                })
            };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : "Error desconocido.";
            console.error("Error al subir evidencia:", error);
            return { statusCode: 500, body: JSON.stringify({ message: `Error en la subida: ${msg}` }) };
        }
    });
}
