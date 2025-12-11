// src/handlers/verifyUserIdentity.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { dbConfig } from '../config/db.config';
import { UserService } from '../services/user.service';
import { KYCService } from '../services/kyc.service';

const pool = new Pool(dbConfig);
const userService = new UserService(pool);
const kycService = new KYCService(pool);

/**
 * Handler para que un Sitter registre la verificación de identidad (KYC).
 * RUTA PROTEGIDA: Solo para usuarios logueados.
 */
export async function verifyUserIdentityHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

    if (!event.headers.Authorization || !event.body) {
        return { statusCode: 401, body: JSON.stringify({ message: "Auth requerida." }) };
    }

    let payload;
    try {
        payload = userService.verifyToken(event.headers.Authorization);
    } catch (error) {
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
        await kycService.verifyUserIdentity(userId, userType, validationToken);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Identidad verificada exitosamente. Estado: VERIFIED.",
                kycStatus: 'VERIFIED'
            })
        };

    } catch (error) {
        const msg = error instanceof Error ? error.message : "Error desconocido.";
        console.error("Error en la verificación KYC:", error);
        
        // Retornar 403 (Forbidden) si es un fallo de verificación
        if (msg.includes("fallida") || msg.includes("inválido")) {
            return { statusCode: 403, body: JSON.stringify({ message: msg, kycStatus: 'FAILED' }) };
        }
        
        return { statusCode: 500, body: JSON.stringify({ message: msg }) };
    }
}
