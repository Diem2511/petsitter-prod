import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as dns from 'dns';

dotenv.config();
dns.setDefaultResultOrder('ipv4first');

// Si existe DATABASE_URL, úsala directamente
if (process.env.DATABASE_URL) {
    // Forzar que la URL use el hostname IPv4
    const url = new URL(process.env.DATABASE_URL);
    
    export const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
} else {
    // Fallback a variables individuales
    export const dbConfig = {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'petsitter_db',
        password: process.env.DB_PASSWORD || 'petsitter',
        port: parseInt(process.env.DB_PORT || '5432'),
    };
    
    export const pool = new Pool(dbConfig);
}
