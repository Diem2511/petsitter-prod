"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
class ChatService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    // Expresión regular para detectar números de 8 a 12 dígitos o emails simples
    evasionPattern = /(\d{3}[-\s]?\d{3}[-\s]?\d{4})|(\w+@\w+\.\w+)/g;
    filterMessage(message) {
        const isEvasionAttempt = this.evasionPattern.test(message);
        let filteredMessage = message;
        if (isEvasionAttempt) {
            // Reemplazamos la información sensible
            filteredMessage = message.replace(this.evasionPattern, (match) => {
                if (match.includes('@')) {
                    return '[EMAIL BLOQUEADO]';
                }
                return '[NÚMERO BLOQUEADO]';
            });
        }
        return { filteredMessage, isEvasionAttempt };
    }
    /**
     * Obtiene el Connection ID del usuario con quien se está chateando (Cliente/Sitter opuesto).
     * Nota: En una app real, esto sería más complejo (salas de chat por bookingId).
     * Aquí, simplificaremos asumiendo que el Cliente y el Sitter tienen una conexión WS activa.
     */
    async getRecipientConnectionId(senderId, bookingId) {
        // 1. Encontrar el ID del otro participante (recipientId)
        const bookingResult = await this.pool.query('SELECT sitter_id, client_id FROM bookings WHERE booking_id = $1', [bookingId]);
        if (bookingResult.rows.length === 0)
            return null;
        const booking = bookingResult.rows[0];
        const recipientId = booking.sitter_id === senderId ? booking.client_id : booking.sitter_id;
        // 2. Buscar el connectionId activo del recipiente
        const connectionResult = await this.pool.query('SELECT connection_id FROM ws_connections WHERE user_id = $1', [recipientId]);
        return connectionResult.rows.length > 0 ? connectionResult.rows[0].connection_id : null;
    }
}
exports.ChatService = ChatService;
