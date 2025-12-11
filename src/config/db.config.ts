import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// FORZAMOS LA CARGA DE .ENV AQUÍ MISMO
dotenv.config();

export const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'petsitter_db',
    password: process.env.DB_PASSWORD || 'petsitter', // Fallback por seguridad
    port: parseInt(process.env.DB_PORT || '5432'),
};

export const pool = new Pool(dbConfig);
