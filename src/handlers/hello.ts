import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
    console.log("Evento recibido:", JSON.stringify(event, null, 2));

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "PetSitter Vecinal API V1 - Operativa",
            timestamp: new Date().toISOString()
        }),
    };
};
