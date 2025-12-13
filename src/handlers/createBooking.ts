import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { dbConfig } from '../config/db.config';
import { UserService } from '../services/user.service';
import { BookingService } from '../services/booking.service';

const pool = dbConfig.pool;
const userService = new UserService(pool);
const bookingService = new BookingService(pool);

/**
 * Handler para que un cliente cree una solicitud de reserva (status PENDING).
 * RUTA PROTEGIDA: Requiere JWT de un Cliente.
 */
export async function createBookingHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    
    // 1. AUTORIZACIÓN (Verificar JWT y obtener clientId)
    if (!event.headers.Authorization || !event.body) {
        return { statusCode: 401, body: JSON.stringify({ message: "Autorización o cuerpo de solicitud requeridos." }) };
    }
    
    let payload;
    try {
        payload = userService.verifyToken(event.headers.Authorization);
        if (payload.userType !== 'client') {
            return { statusCode: 403, body: JSON.stringify({ message: "Solo Clientes pueden crear reservas." }) };
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ message: "Token inválido o expirado." }) };
    }

    const clientId = payload.userId;
    const { sitterId, petType, serviceType, startTime, endTime, totalPrice } = JSON.parse(event.body);

    if (!sitterId || !petType || !serviceType || !startTime || !endTime || totalPrice === undefined) {
        return { statusCode: 400, body: JSON.stringify({ message: "Faltan campos obligatorios para la reserva." }) };
    }

    try {
        const booking = await bookingService.createBooking(clientId, {
            sitterId,
            petType,
            serviceType,
            startTime,
            endTime,
            totalPrice
        });
        
        // En un sistema real, aquí se notificaría al Sitter.
        
        return {
            statusCode: 201,
            body: JSON.stringify({ 
                message: "Reserva creada exitosamente, pendiente de aceptación del Sitter.", 
                bookingId: booking.booking_id,
                status: booking.status
            })
        };

    } catch (error) {
        // Manejar errores de validación de fechas o DB
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al crear la reserva.";
        return { statusCode: 400, body: JSON.stringify({ message: errorMessage }) };
    }
}
