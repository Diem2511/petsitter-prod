import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuración de conexión con el FIX para certificado auto-firmado
const connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // <--- ESTO ES LO QUE SOLUCIONA EL ERROR "SELF-SIGNED CERTIFICATE"
    }
};

// 1. Exportamos la configuración (necesario para que los handlers no den error de compilación)
export const dbConfig = connectionConfig;

// 2. Exportamos la pool (necesario para las consultas a la base de datos)
export const pool = new Pool(connectionConfig);

// Logs para monitorear la salud de la conexión
pool.on('connect', () => {
    console.log('✅ DB: Conexión establecida con el Pool');
});

pool.on('error', (err) => {
    console.error('❌ DB: Error inesperado en el Pool:', err);
});