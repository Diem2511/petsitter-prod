import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'petsitter_db',
    password: process.env.DB_PASSWORD || 'petsitter',
    port: parseInt(process.env.DB_PORT || '5432'),
    // FORZAR IPv4
    options: '-c client_encoding=UTF8'
};

export const pool = new Pool({
    ...dbConfig,
    // Configuración adicional para forzar IPv4
    connectionTimeoutMillis: 10000,
});

// Forzar resolución DNS a IPv4
import * as dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
