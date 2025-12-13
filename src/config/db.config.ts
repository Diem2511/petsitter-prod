import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    }
};

export const dbConfig = connectionConfig;

// AQUÍ ESTÁ EL CAMBIO IMPORTANTE PARA EL POOL
// A veces el Pool necesita que el SSL se pase explícitamente fuera del connectionString
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on('connect', () => {
    console.log('✅ DB: Pool conectado');
});

pool.on('error', (err) => {
    console.error('❌ DB: Error en Pool:', err);
});