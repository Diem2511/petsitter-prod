// src/handlers/getSitterEarnings.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { dbConfig } from '../config/db.config';
import { UserService } from '../services/user.service';
import { PaymentService } from '../services/payment.service';

const pool = dbConfig.pool;
const userService = new UserService(pool);
const paymentService = new PaymentService(pool);

/**
 * Handler para obtener el resumen financiero de un Sitter.
 * RUTA PROTEGIDA: Solo para usuarios 'sitter'.
 */
export async function getSitterEarningsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

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
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ message: "Token inválido." }) };
    }

    const sitterId = payload.userId;

    try {
        // 2. Calcular Ganancias
        const earnings = await paymentService.calculateSitterEarnings(sitterId);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Resumen de ganancias obtenido exitosamente.",
                sitterId,
                earnings
            })
        };

    } catch (error) {
        const msg = error instanceof Error ? error.message : "Error desconocido.";
        console.error("Error al obtener ganancias:", error);
        return { statusCode: 500, body: JSON.stringify({ message: `Error interno: ${msg}` }) };
    }
}
