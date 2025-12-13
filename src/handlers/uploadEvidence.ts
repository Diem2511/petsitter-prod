// src/handlers/uploadEvidence.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { dbConfig } from '../config/db.config';
import { UserService } from '../services/user.service';
import { FileService } from '../services/file.service';

const pool = dbConfig.pool;
const userService = new UserService(pool);
const fileService = new FileService(pool);

/**
 * Handler para que el Sitter suba evidencia fotográfica del servicio.
 * RUTA PROTEGIDA: Solo para Sitters.
 */
export async function uploadEvidenceHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

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
    } catch (error) {
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
        const result = await fileService.uploadEvidence(
            sitterId, 
            bookingId, 
            fileData, 
            mimeType, 
            parseFloat(latitude), 
            parseFloat(longitude)
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Evidencia subida exitosamente.",
                evidenceId: result.evidenceId,
                fileUrl: result.fileUrl // URL con marca de agua (coordenadas/timestamp)
            })
        };

    } catch (error) {
        const msg = error instanceof Error ? error.message : "Error desconocido.";
        console.error("Error al subir evidencia:", error);
        return { statusCode: 500, body: JSON.stringify({ message: `Error en la subida: ${msg}` }) };
    }
}
