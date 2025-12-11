import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { dbConfig } from '../config/db.config';
import { UserService } from '../services/user.service';
import { BookingService } from '../services/booking.service';
import { ReviewService } from '../services/review.service';

const pool = new Pool(dbConfig);
const userService = new UserService(pool);
const bookingService = new BookingService(pool);
const reviewService = new ReviewService(pool);

export async function submitReviewHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    
    if (!event.headers.Authorization || !event.body) {
        return { statusCode: 401, body: JSON.stringify({ message: "Autorización o cuerpo de solicitud requeridos." }) };
    }
    
    let payload; 
    try {
        payload = userService.verifyToken(event.headers.Authorization);
        if (payload.userType !== 'client') {
            return { statusCode: 403, body: JSON.stringify({ message: "Solo Clientes pueden dejar reviews." }) };
        }
    } catch (error) {
        return { statusCode: 401, body: JSON.stringify({ message: "Token inválido o expirado." }) };
    }

    const clientId = payload.userId;
    const { bookingId, rating, comment } = JSON.parse(event.body as string); 

    if (!bookingId || rating === undefined || typeof rating !== 'number') {
        return { statusCode: 400, body: JSON.stringify({ message: "ID de reserva y calificación (1-5) son obligatorios." }) };
    }

    try {
        const { sitter_id } = await bookingService.validateReviewEligibility(bookingId, clientId);
        const review = await reviewService.submitReview(sitter_id, clientId, bookingId, rating, comment);
        
        return {
            statusCode: 201,
            body: JSON.stringify({ 
                message: "Review registrada exitosamente.", 
                reviewId: review.review_id,
                rating: review.rating
            })
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al procesar la review.";
        return { statusCode: 403, body: JSON.stringify({ message: errorMessage }) };
    }
}
