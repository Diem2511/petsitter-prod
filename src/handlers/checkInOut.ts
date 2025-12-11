// src/handlers/checkInOut.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { dbConfig } from '../config/db.config';
import { UserService } from '../services/user.service';
import { BookingService } from '../services/booking.service';

const pool = new Pool(dbConfig);
const userService = new UserService(pool);
const bookingService = new BookingService(pool);

/**
 * Handler para que el Sitter inicie (Check-in) o finalice (Check-out) una reserva.
 * RUTA PROTEGIDA: Solo para Sitters.
 */
export async function checkInOutHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    
    // 1. Auth y Sitter Check
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
    const { bookingId, action, latitude, longitude } = JSON.parse(event.body);

    if (!bookingId || (action !== 'CHECK_IN' && action !== 'CHECK_OUT')) {
        return { statusCode: 400, body: JSON.stringify({ message: "ID de reserva y acción ('CHECK_IN' o 'CHECK_OUT') son obligatorios." }) };
    }
    
    if (action === 'CHECK_IN' && (!latitude || !longitude)) {
        return { statusCode: 400, body: JSON.stringify({ message: "Latitude y Longitude son obligatorios para el Check-in." }) };
    }

    try {
        if (action === 'CHECK_IN') {
            await bookingService.sitterCheckIn(bookingId, sitterId, parseFloat(latitude), parseFloat(longitude));
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Check-in registrado. Reserva en estado ACTIVE." })
            };
        } 
        
        if (action === 'CHECK_OUT') {
            await bookingService.sitterCheckOut(bookingId, sitterId);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Check-out registrado. Reserva en estado COMPLETED. Pago disparado." })
            };
        }

        return { statusCode: 400, body: JSON.stringify({ message: "Acción no válida." }) };

    } catch (error) {
        const msg = error instanceof Error ? error.message : "Error desconocido.";
        console.error(`Error en ${action}:`, error);
        return { statusCode: 403, body: JSON.stringify({ message: msg }) };
    }
}
