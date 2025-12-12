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
exports.FileService = void 0;
const uuid_1 = require("uuid");
class FileService {
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Sube y registra la metadata de una foto de evidencia (ej. Check-in, Heces).
     * En producción, esto interactuaría con el SDK de AWS S3.
     */
    uploadEvidence(userId, bookingId, fileData, // En una app real, esto sería el buffer/stream del archivo.
    mimeType, latitude, longitude) {
        return __awaiter(this, void 0, void 0, function* () {
            const evidenceId = (0, uuid_1.v4)();
            const s3Key = `evidence/${userId}/${bookingId}/${evidenceId}.jpg`;
            const simulatedUrl = `https://petsittervecinal.s3.amazonaws.com/${s3Key}`;
            // 1. Simulación de Almacenamiento S3 (Mock)
            // console.log(`[S3 MOCK] Archivo subido: ${s3Key}.`);
            // 2. Simulación de Marca de Agua (Añadir metadatos a la URL)
            const watermarkedUrl = `${simulatedUrl}?ts=${new Date().toISOString()}&lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`;
            // 3. Registro de metadatos en BBDD (Necesitaremos una tabla para esto)
            // Nota: Asumimos la existencia de la tabla 'evidence_files' para este registro.
            try {
                yield this.pool.query(`INSERT INTO evidence_files (evidence_id, user_id, booking_id, s3_key, mime_type, latitude, longitude, watermarked_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [evidenceId, userId, bookingId, s3Key, mimeType, latitude, longitude, watermarkedUrl]);
            }
            catch (error) {
                console.error("Error registrando evidencia en DB:", error);
                // En un caso real, aquí se revertiría la subida a S3
                throw new Error("No se pudo registrar la evidencia.");
            }
            return { fileUrl: watermarkedUrl, evidenceId };
        });
    }
}
exports.FileService = FileService;
