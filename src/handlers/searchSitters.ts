// src/handlers/searchSitters.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { dbConfig } from '../config/db.config';
import { UserService } from '../services/user.service';
import { SearchService } from '../services/search.service';
import { IcvService } from '../services/icv.service';
import { ReviewService } from '../services/review.service';
import { Neo4jService } from '../services/neo4j.service';

const pool = dbConfig.pool;
const userService = new UserService(pool);

// 1. Instanciamos dependencias en orden correcto
const reviewService = new ReviewService(pool);
const neo4jService = new Neo4jService(); 

// 2. IcvService necesita Neo4j y Review
const icvService = new IcvService(neo4jService, reviewService);

// 3. SearchService necesita Pool e IcvService
const searchService = new SearchService(pool, icvService);

export async function searchSittersHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

     if (!event.headers.Authorization || !event.body) {
         return { statusCode: 401, body: JSON.stringify({ message: "Autorización requerida." }) };
     }

     let payload;
     try {
         payload = userService.verifyToken(event.headers.Authorization);
         if (payload.userType !== 'client') {
             return { statusCode: 403, body: JSON.stringify({ message: "Solo Clientes." }) };
         }
     } catch (error) {
         return { statusCode: 401, body: JSON.stringify({ message: "Token inválido." }) };
     }

     const { latitude, longitude, maxDistanceKM, limit } = JSON.parse(event.body);

     if (!latitude || !longitude) {
         return { statusCode: 400, body: JSON.stringify({ message: "Ubicación requerida." }) };
     }

     try {
         // CORRECCIÓN: El método en SearchService se llama "searchSitters", no "findAndRankSitters"
         const sitters = await searchService.searchSitters(
             parseFloat(latitude),
             parseFloat(longitude),
             maxDistanceKM !== undefined ? parseFloat(maxDistanceKM) : 5,
             limit ? parseInt(limit) : 10
         );

         return {
             statusCode: 200,
             body: JSON.stringify(sitters)
         };

     } catch (error) {
         console.error("Error búsqueda:", error);
         return { statusCode: 500, body: JSON.stringify({ message: "Error interno." }) };
     }
}
