"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async (event) => {
    console.log("Evento recibido:", JSON.stringify(event, null, 2));
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "PetSitter Vecinal API V1 - Operativa",
            timestamp: new Date().toISOString()
        }),
    };
};
exports.handler = handler;
