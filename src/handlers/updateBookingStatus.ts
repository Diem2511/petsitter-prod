import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { dbConfig } from '../config/db.config';
import { UserService } from '../services/user.service';
import { BookingService } from '../services/booking.service';

const pool = new Pool(dbConfig);
const userService = new UserService(pool);
const bookingService = new BookingService(pool);

/**
 * Handler para que un Sitter acepte o rechace una reserva.
 * RUTA PROTEGIDA: Requiere JWT de un Sitter.
 */
export async function updateBookingStatusHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    
    // 1. AUTORIZACIÓN (Verificar JWT y obtener sitterId)
    if (!event.headers.Authorization || !event.body) {
        return { statusCode: 401, body: JSON.stringify({ message: "Autorización o cuerpo de solicitud requeridos." }) };
    }
    
    let payload;
    try {
        payload = userService.verifyToken(event.headers.Authorization);
        if (payload.userType !== 'sitter') {
            return { statusCode: 403, body: JSON.stringify({ message: "Solo Sitters pueden aceptar/rechazar reservas." }) };
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ message: "Token inválido o expirado." }) };
    }

    const sitterId = payload.userId;
    const { bookingId, status } = JSON.parse(event.body);

    if (!bookingId || !status || (status !== 'ACCEPTED' && status !== 'REJECTED')) {
        return { statusCode: 400, body: JSON.stringify({ message: "ID de reserva y estado ('ACCEPTED' o 'REJECTED') son obligatorios." }) };
    }

    try {
        const booking = await bookingService.updateBookingStatus(
            sitterId, 
            bookingId, 
            status
        );
        
        // En un sistema real, aquí se notificaría al Cliente.
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: `Reserva ${bookingId} actualizada a ${booking.status}.`, 
                bookingId: booking.booking_id,
                status: booking.status
            })
        };

    } catch (error) {
        // Capturar errores de validación (acceso denegado, estado incorrecto)
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al actualizar la reserva.";
        return { statusCode: 403, body: JSON.stringify({ message: errorMessage }) };
    }
}
