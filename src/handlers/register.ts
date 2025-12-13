// src/handlers/register.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { Pool } from 'pg';
import { dbConfig } from '../config/db.config';
import { UserService } from '../services/user.service';

const pool = dbConfig.pool;
const userService = new UserService(pool);

export const registerHandler: APIGatewayProxyHandler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        
        // Extraemos los campos individuales del body
        const { email, user_type, password, first_name, last_name } = body;

        // Validación básica
        if (!email || !user_type || !password) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Email, password y user_type son requeridos.' }),
            };
        }

        // Llamada corregida: Pasamos argumentos separados en lugar de un objeto
        const { token, userId } = await userService.registerUser(
            email, 
            user_type, 
            password, 
            first_name, 
            last_name
        );

        return {
            statusCode: 201,
            body: JSON.stringify({ 
                message: 'Usuario registrado exitosamente',
                userId,
                token 
            }),
        };
    } catch (error: any) {
        console.error('Error en registerHandler:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message || 'Error interno del servidor' }),
        };
    }
};
