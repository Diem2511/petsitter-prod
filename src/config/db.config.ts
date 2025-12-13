import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// 1. Definimos la configuración que tanto Supabase como tus archivos necesitan
const connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
};

// 2. ¡ESTA ES LA LÍNEA QUE FALTABA!
// Tus otros archivos importan "dbConfig", así que se lo devolvemos.
export const dbConfig = connectionConfig;

// 3. Creamos y exportamos la pool
export const pool = new Pool(connectionConfig);

// 4. Logs de diagnóstico (opcional, pero útil)
pool.on('connect', () => {
    console.log('✅ DB: Cliente conectado al pool');
});

pool.on('error', (err) => {
    console.error('❌ DB: Error inesperado en cliente inactivo', err);
});