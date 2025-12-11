// src/handlers/getSitterRecommendations.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { dbConfig } from '../config/db.config';
import { UserService } from '../services/user.service';
import { TrustGraphService } from '../services/trustGraph.service';

const pool = new Pool(dbConfig);
const userService = new UserService(pool);
const trustGraphService = new TrustGraphService(pool);

/**
 * Handler para obtener Sitters recomendados, ordenados por Índice de Confianza Vecinal (ICV).
 */
export async function getSitterRecommendationsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

    // 1. Auth (Solo clientes buscan Sitters)
    if (!event.headers.Authorization) {
        return { statusCode: 401, body: JSON.stringify({ message: "Auth requerida." }) };
    }

    let payload;
    try {
        payload = userService.verifyToken(event.headers.Authorization);
        if (payload.userType !== 'client') {
            return { statusCode: 403, body: JSON.stringify({ message: "Solo clientes pueden buscar Sitters." }) };
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ message: "Token inválido." }) };
    }

    const clientId = payload.userId;

    try {
        // 2. Calcular ICV y obtener ranking
        const recommendations = await trustGraphService.getSitterRecommendations(clientId);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Recomendaciones ICV obtenidas exitosamente.",
                recommendations
            })
        };

    } catch (error) {
        const msg = error instanceof Error ? error.message : "Error desconocido.";
        console.error("Error al obtener recomendaciones:", error);
        return { statusCode: 500, body: JSON.stringify({ message: `Error en el motor ICV: ${msg}` }) };
    }
}
