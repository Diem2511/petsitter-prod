import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

console.log('🚀 Inicializando PostgreSQL...');

// Validación de emergencia: Si la URL tiene IPv6, avisamos
if (process.env.DATABASE_URL?.includes('2600:')) {
    console.error('❌ ERROR FATAL: DATABASE_URL contiene una IP IPv6. CAMBIALA EN RENDER POR EL DOMINIO db.qzgdv...supabase.co');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Esto es lo único que Supabase necesita
    },
    connectionTimeoutMillis: 10000,
});

pool.query('SELECT NOW()')
    .then(() => console.log('✅ PostgreSQL conectado exitosamente'))
    .catch(err => console.error('❌ Error conexión inicial:', err.message));

export default pool;