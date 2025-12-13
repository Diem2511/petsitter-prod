import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 PostgreSQL Config - VERSIÓN CORREGIDA');

// USAR HOSTNAME FIJO - EVITAR DATABASE_URL PROBLEMÁTICO
const SUPABASE_HOST = 'db.qzgdviycwxzmvwtazkis.supabase.co';
const SUPABASE_PASSWORD = 'riXQZxxxxxx4o3Ne'; // Tu password real

console.log('🏷️  Usando hostname fijo:', SUPABASE_HOST);

// Crear connection string manualmente
const connectionString = `postgresql://postgres:${SUPABASE_PASSWORD}@${SUPABASE_HOST}:5432/postgres?sslmode=require`;

console.log('🔗 Connection string generado (seguro):', 
  connectionString.replace(/:[^:@]+@/, ':****@'));

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 5,
});

// Test de conexión
setTimeout(async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    console.log('✅ PostgreSQL CONECTADO! Hora:', result.rows[0].time);
    client.release();
  } catch (err: any) {
    console.error('❌ Error conexión PostgreSQL:', err.message);
    console.error('   Host intentado:', SUPABASE_HOST);
  }
}, 2000);

export default pool;