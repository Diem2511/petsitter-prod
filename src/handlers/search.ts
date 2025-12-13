import { APIGatewayProxyHandler } from 'aws-lambda';
import { Pool } from 'pg';
import { dbConfig } from '../config/db.config';
import { haversineDistance } from '../services/geo.service';

const pool = dbConfig.pool;

export const searchHandler: APIGatewayProxyHandler = async (event) => {
    try {
        const { latitude, longitude, radius } = event.queryStringParameters || {};

        if (!latitude || !longitude) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Se requieren latitud y longitud." })
            };
        }

        const userLat = parseFloat(latitude);
        const userLon = parseFloat(longitude);
        const searchRadius = radius ? parseFloat(radius) : 10; // km por defecto

        // Obtenemos todos los sitters
        const query = "SELECT * FROM users WHERE user_type = 'sitter'";
        const result = await pool.query(query);
        
        // Filtramos en código usando la función de geo.service
        const sitters = result.rows.map(sitter => {
            const dist = haversineDistance(
                userLat, 
                userLon, 
                parseFloat(sitter.latitude || '0'), 
                parseFloat(sitter.longitude || '0')
            );
            return { ...sitter, distance_km: dist };
        }).filter(sitter => sitter.distance_km <= searchRadius);

        return {
            statusCode: 200,
            body: JSON.stringify(sitters)
        };
    } catch (error: any) {
        console.error("Error en búsqueda:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error interno del servidor", error: error.message })
        };
    }
};
