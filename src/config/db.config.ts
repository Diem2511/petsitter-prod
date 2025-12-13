import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

console.log('🚀 Inicializando PostgreSQL...');

// Definimos la configuración base
let poolConfig: any = {
    // Forzamos timeouts para que no se quede colgado si falla la red
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
    // CRÍTICO: Forzar SSL para Supabase
    ssl: {
        rejectUnauthorized: false, // Necesario para evitar error de certificado auto-firmado
    }
};

if (process.env.DATABASE_URL) {
    console.log('📦 Usando DATABASE_URL detectada');
    poolConfig.connectionString = process.env.DATABASE_URL;
} else {
    console.log('🔧 Usando variables individuales (Fallback)');
    poolConfig.host = process.env.DB_HOST || 'db.qzgdviycwxzmvwtazkis.supabase.co';
    poolConfig.user = process.env.DB_USER || 'postgres';
    poolConfig.password = process.env.DB_PASSWORD;
    poolConfig.database = process.env.DB_NAME || 'postgres';
    poolConfig.port = parseInt(process.env.DB_PORT || '5432');
}

const pool = new Pool(poolConfig);

// Test de conexión inmediato (solo log, no bloquea el inicio)
pool.query('SELECT NOW() as time')
    .then(result => {
        console.log('✅ PostgreSQL conectado exitosamente!');
        console.log('   Hora DB:', result.rows[0].time);
    })
    .catch(err => {
        console.error('❌ Error conectando a PostgreSQL al inicio:');
        console.error('   Mensaje:', err.message);
    });

export const dbConfig = poolConfig; // Exportamos la config por si otro archivo la pide
export default pool;