// src/handlers/chat.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { dbConfig } from '../config/db.config';
import { UserService } from '../services/user.service';
import { ConnectionService } from '../services/connection.service';
import { ChatService } from '../services/chat.service';

const pool = new Pool(dbConfig);
const userService = new UserService(pool);
const connectionService = new ConnectionService(pool);
const chatService = new ChatService(pool);

// Mock del cliente de AWS API Gateway Management API (necesario para enviar mensajes WS)
// En entorno de prueba, solo logearemos el intento de envío.
const apigwManagementApi = {
    postToConnection: ({ ConnectionId, Data }: { ConnectionId: string, Data: string }) => {
        console.log(`[WS-SEND] Enviando a ${ConnectionId}: ${Data}`);
        return Promise.resolve({ statusCode: 200 }); // Simulación de éxito
    }
};

// --- HANDLER $CONNECT ---
export async function connectHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const connectionId = event.requestContext.connectionId!;
    const token = event.queryStringParameters?.token; // Token pasado en la URL de conexión

    if (!token) {
        return { statusCode: 401, body: "Token no proporcionado." };
    }

    try {
        // Aquí se simularía la verificación del token y se obtendría el userId
        const payload = userService.verifyToken(token);
        await connectionService.addConnection(connectionId, payload.userId);

        console.log(`[WS-CONNECT] Conexión establecida: ${connectionId} (User: ${payload.userId})`);
        return { statusCode: 200, body: "Conectado." };
    } catch (error) {
        console.error("[WS-CONNECT] Error de autenticación:", error);
        await connectionService.removeConnection(connectionId); // Limpiar conexión fallida
        return { statusCode: 401, body: "Autenticación fallida." };
    }
}

// --- HANDLER $DISCONNECT ---
export async function disconnectHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const connectionId = event.requestContext.connectionId!;

    try {
        await connectionService.removeConnection(connectionId);
        console.log(`[WS-DISCONNECT] Conexión terminada: ${connectionId}`);
        return { statusCode: 200, body: "Desconectado." };
    } catch (error) {
        console.error("[WS-DISCONNECT] Error al eliminar conexión:", error);
        return { statusCode: 500, body: "Error al desconectar." };
    }
}

// --- HANDLER $DEFAULT (Enviar Mensaje) ---
export async function defaultHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const connectionId = event.requestContext.connectionId!;
    let body;

    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, body: "Cuerpo de mensaje inválido." };
    }

    const { bookingId, message } = body;
    if (!bookingId || !message) {
        return { statusCode: 400, body: "Faltan datos: bookingId y message." };
    }

    // 1. Obtener ID del remitente
    const senderId = await connectionService.getUserIdByConnectionId(connectionId);
    if (!senderId) {
        return { statusCode: 401, body: "Usuario no autenticado." };
    }
    
    // 2. Filtrar Mensaje
    const { filteredMessage, isEvasionAttempt } = chatService.filterMessage(message);

    // 3. Obtener el Connection ID del destinatario
    const recipientConnectionId = await chatService.getRecipientConnectionId(senderId, bookingId);
    
    if (!recipientConnectionId) {
        // Enviar al remitente un mensaje de que el otro usuario no está online
        await apigwManagementApi.postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify({ type: 'STATUS', message: 'El otro usuario no está conectado.' })
        });
        return { statusCode: 200, body: "Destinatario no conectado." };
    }
    
    // 4. Construir y enviar mensaje
    const chatMessage = {
        type: 'MESSAGE',
        senderId,
        bookingId,
        timestamp: new Date().toISOString(),
        content: filteredMessage,
        warning: isEvasionAttempt ? "¡ATENCIÓN! Se detectó y filtró información de contacto. El intento de evasión podría impactar su ICV." : undefined
    };

    // Envío al destinatario
    await apigwManagementApi.postToConnection({
        ConnectionId: recipientConnectionId,
        Data: JSON.stringify(chatMessage)
    });

    // Envío de confirmación al remitente (para actualizar su propia UI)
    await apigwManagementApi.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({ ...chatMessage, type: 'CONFIRMATION' })
    });

    return { statusCode: 200, body: "Mensaje procesado y enviado." };
}
