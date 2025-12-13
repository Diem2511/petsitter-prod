import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { URL } from 'url';

dotenv.config();

console.log('🚀 Inicializando PostgreSQL (Configuración Desglosada IPv4)...');

let config: any = {
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
};

if (process.env.DATABASE_URL) {
    try {
        // Parseamos la URL nosotros mismos
        // Esto ignora si la variable tiene basura, extraemos lo útil
        // Si Render tiene una IP en la URL, la ignoramos y forzamos el host real
        const parser = new URL(process.env.DATABASE_URL);
        
        config.user = parser.username;
        config.password = parser.password;
        config.host = 'db.qzgdviycwxzmvwtazkis.supabase.co'; // <--- HARDCODED PARA ASEGURARNOS
        config.port = 5432;
        config.database = 'postgres';
        
    } catch (e) {
        console.error('Error parseando URL, usando fallback string');
        config.connectionString = process.env.DATABASE_URL;
    }
}

const pool = new Pool(config);

pool.query('SELECT NOW()')
    .then(() => console.log('✅ CONEXIÓN EXITOSA'))
    .catch(err => console.error('❌ Error:', err.message));

export default pool;