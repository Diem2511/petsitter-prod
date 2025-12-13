// src/handlers/createPayment.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { dbConfig } from '../config/db.config';
import { UserService } from '../services/user.service';
import { PaymentService } from '../services/payment.service';
import { BookingService } from '../services/booking.service';

const pool = dbConfig.pool;
const userService = new UserService(pool);
const paymentService = new PaymentService(pool);
// Usamos el pool directamente para verificar la reserva si es necesario, 
// o podríamos instanciar BookingService si quisiéramos validar estado.

export async function createPaymentHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    
    // 1. Auth
    if (!event.headers.Authorization || !event.body) {
        return { statusCode: 401, body: JSON.stringify({ message: "Auth requerida." }) };
    }

    let payload;
    try {
        payload = userService.verifyToken(event.headers.Authorization);
        if (payload.userType !== 'client') {
            return { statusCode: 403, body: JSON.stringify({ message: "Solo clientes pagan." }) };
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ message: "Token inválido." }) };
    }

    const { bookingId, amount, paymentMethod } = JSON.parse(event.body);

    if (!bookingId || !amount || !paymentMethod) {
        return { statusCode: 400, body: JSON.stringify({ message: "Faltan datos (bookingId, amount, paymentMethod)." }) };
    }

    try {
        // En un flujo real, aquí verificaríamos que la reserva pertenezca al cliente.
        
        const payment = await paymentService.processPayment(bookingId, parseFloat(amount), paymentMethod);

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: "Pago procesado exitosamente.",
                paymentId: payment.payment_id,
                status: payment.status
            })
        };

    } catch (error) {
        const msg = error instanceof Error ? error.message : "Error desconocido.";
        return { statusCode: 500, body: JSON.stringify({ message: msg }) };
    }
}
