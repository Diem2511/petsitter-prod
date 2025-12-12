import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

let poolConfig: any;

if (process.env.DATABASE_URL) {
    // Parsear la DATABASE_URL para extraer las partes
    const dbUrl = new URL(process.env.DATABASE_URL);
    
    poolConfig = {
        user: dbUrl.username,
        password: dbUrl.password,
        host: dbUrl.hostname, // Esto debería dar el hostname, no la IP
        port: parseInt(dbUrl.port || '5432'),
        database: dbUrl.pathname.slice(1), // Remover el / inicial
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        // Forzar familia de direcciones IPv4
        ...(process.env.NODE_ENV === 'production' && { 
            options: '-c client_encoding=UTF8'
        })
    };
} else {
    poolConfig = {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'petsitter_db',
        password: process.env.DB_PASSWORD || 'petsitter',
        port: parseInt(process.env.DB_PORT || '5432'),
    };
}

export const dbConfig = poolConfig;
export const pool = new Pool(poolConfig);