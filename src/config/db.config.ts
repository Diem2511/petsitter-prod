import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as dns from 'dns';

dotenv.config();
dns.setDefaultResultOrder('ipv4first');

let poolConfig: any;

if (process.env.DATABASE_URL) {
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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
