import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

console.log('🚀 Inicializando PostgreSQL...');

// 1. Definimos la configuración (SIN 'require: true' para calmar a TypeScript)
export const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Esto es lo único que Supabase necesita
    },
    // Forzamos timeouts
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
};

// Fallback por si no hay DATABASE_URL (para desarrollo local sin .env correcto)
if (!process.env.DATABASE_URL) {
    console.log('⚠️ No hay DATABASE_URL, usando variables sueltas...');
    // @ts-ignore: Ignoramos validación estricta aquí para el fallback
    poolConfig.host = process.env.DB_HOST;
    // @ts-ignore
    poolConfig.user = process.env.DB_USER;
    // @ts-ignore
    poolConfig.password = process.env.DB_PASSWORD;
    // @ts-ignore
    poolConfig.database = process.env.DB_NAME;
    // @ts-ignore
    poolConfig.port = parseInt(process.env.DB_PORT || '5432');
    delete poolConfig.connectionString;
}

// 2. Creamos el pool compartido
const pool = new Pool(poolConfig);

pool.query('SELECT NOW() as time')
    .then(result => {
        console.log('✅ PostgreSQL conectado! Hora DB:', result.rows[0].time);
    })
    .catch(err => {
        console.error('❌ Error conectando a PostgreSQL:', err.message);
    });

export default pool;