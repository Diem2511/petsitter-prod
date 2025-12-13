import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

console.log('🚀 Inicializando PostgreSQL...');

const databaseUrl = process.env.DATABASE_URL;
let poolConfig: PoolConfig;

if (databaseUrl) {
    console.log('📦 Usando DATABASE_URL');
    poolConfig = {
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false, // Esto es lo único vital para Supabase
        },
        connectionTimeoutMillis: 10000,
        query_timeout: 10000,
    };
} else {
    // Fallback simple
    poolConfig = {
        connectionString: 'postgres://dummy:dummy@localhost:5432/dummy',
    };
}

const pool = new Pool(poolConfig);

// Test conexión (No bloqueante)
pool.query('SELECT NOW()')
    .then(() => console.log('✅ PostgreSQL conectado'))
    .catch(err => console.error('❌ Error conexión PG:', err.message));

export default pool;