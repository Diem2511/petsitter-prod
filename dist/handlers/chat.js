"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectHandler = connectHandler;
exports.disconnectHandler = disconnectHandler;
exports.defaultHandler = defaultHandler;
const db_config_1 = require("../config/db.config");
const user_service_1 = require("../services/user.service");
const connection_service_1 = require("../services/connection.service");
const chat_service_1 = require("../services/chat.service");
const pool = db_config_1.dbConfig.pool;
const userService = new user_service_1.UserService(pool);
const connectionService = new connection_service_1.ConnectionService(pool);
const chatService = new chat_service_1.ChatService(pool);
// Mock del cliente de AWS API Gateway Management API (necesario para enviar mensajes WS)
// En entorno de prueba, solo logearemos el intento de envío.
const apigwManagementApi = {
    postToConnection: ({ ConnectionId, Data }) => {
        console.log(`[WS-SEND] Enviando a ${ConnectionId}: ${Data}`);
        return Promise.resolve({ statusCode: 200 }); // Simulación de éxito
    }
};
// --- HANDLER $CONNECT ---
function connectHandler(event) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const connectionId = event.requestContext.connectionId;
        const token = (_a = event.queryStringParameters) === null || _a === void 0 ? void 0 : _a.token; // Token pasado en la URL de conexión
        if (!token) {
            return { statusCode: 401, body: "Token no proporcionado." };
        }
        try {
            // Aquí se simularía la verificación del token y se obtendría el userId
            const payload = userService.verifyToken(token);
            yield connectionService.addConnection(connectionId, payload.userId);
            console.log(`[WS-CONNECT] Conexión establecida: ${connectionId} (User: ${payload.userId})`);
            return { statusCode: 200, body: "Conectado." };
        }
        catch (error) {
            console.error("[WS-CONNECT] Error de autenticación:", error);
            yield connectionService.removeConnection(connectionId); // Limpiar conexión fallida
            return { statusCode: 401, body: "Autenticación fallida." };
        }
    });
}
// --- HANDLER $DISCONNECT ---
function disconnectHandler(event) {
    return __awaiter(this, void 0, void 0, function* () {
        const connectionId = event.requestContext.connectionId;
        try {
            yield connectionService.removeConnection(connectionId);
            console.log(`[WS-DISCONNECT] Conexión terminada: ${connectionId}`);
            return { statusCode: 200, body: "Desconectado." };
        }
        catch (error) {
            console.error("[WS-DISCONNECT] Error al eliminar conexión:", error);
            return { statusCode: 500, body: "Error al desconectar." };
        }
    });
}
// --- HANDLER $DEFAULT (Enviar Mensaje) ---
function defaultHandler(event) {
    return __awaiter(this, void 0, void 0, function* () {
        const connectionId = event.requestContext.connectionId;
        let body;
        try {
            body = JSON.parse(event.body || '{}');
        }
        catch (e) {
            return { statusCode: 400, body: "Cuerpo de mensaje inválido." };
        }
        const { bookingId, message } = body;
        if (!bookingId || !message) {
            return { statusCode: 400, body: "Faltan datos: bookingId y message." };
        }
        // 1. Obtener ID del remitente
        const senderId = yield connectionService.getUserIdByConnectionId(connectionId);
        if (!senderId) {
            return { statusCode: 401, body: "Usuario no autenticado." };
        }
        // 2. Filtrar Mensaje
        const { filteredMessage, isEvasionAttempt } = chatService.filterMessage(message);
        // 3. Obtener el Connection ID del destinatario
        const recipientConnectionId = yield chatService.getRecipientConnectionId(senderId, bookingId);
        if (!recipientConnectionId) {
            // Enviar al remitente un mensaje de que el otro usuario no está online
            yield apigwManagementApi.postToConnection({
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
        yield apigwManagementApi.postToConnection({
            ConnectionId: recipientConnectionId,
            Data: JSON.stringify(chatMessage)
        });
        // Envío de confirmación al remitente (para actualizar su propia UI)
        yield apigwManagementApi.postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify(Object.assign(Object.assign({}, chatMessage), { type: 'CONFIRMATION' }))
        });
        return { statusCode: 200, body: "Mensaje procesado y enviado." };
    });
}
