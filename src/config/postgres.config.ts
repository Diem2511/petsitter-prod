import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('🚀 Inicializando PostgreSQL...');
console.log('🔍 Verificando variables de entorno:');

// DEBUG: Mostrar variables importantes (sin password completo)
const dbHost = process.env.DB_HOST || process.env.PGHOST;
const dbUser = process.env.DB_USER || process.env.PGUSER;
const databaseUrl = process.env.DATABASE_URL;

console.log('   DB_HOST:', dbHost ? '✅ Configurado' : '❌ No configurado');
console.log('   DB_USER:', dbUser ? '✅ Configurado' : '❌ No configurado');
console.log('   DATABASE_URL:', databaseUrl ? '✅ Configurado' : '❌ No configurado');

if (databaseUrl) {
  // Ocultar password para logs seguros
  const safeUrl = databaseUrl.replace(/:[^:]*@/, ':****@');
  console.log('   Connection string:', safeUrl);
}

// OPCIÓN 1: Usar DATABASE_URL (RECOMENDADO)
let pool: Pool;

if (databaseUrl) {
  console.log('📦 Usando DATABASE_URL para la conexión');
  
  // Asegurar que tenga sslmode correcto
  let connectionString = databaseUrl;
  if (!connectionString.includes('sslmode=')) {
    connectionString += '?sslmode=require';
  } else if (connectionString.includes('sslmode=no-verify')) {
    connectionString = connectionString.replace('sslmode=no-verify', 'sslmode=require');
  }
  
  pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false,
      require: true
    },
    // Forzar IPv4 para evitar problemas de DNS
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });
  
} else {
  // OPCIÓN 2: Usar variables individuales
  console.log('🔧 Usando variables individuales DB_*');
  
  const host = dbHost;
  
  if (!host) {
    console.error('❌ ERROR: No hay host configurado para PostgreSQL');
    console.error('   Configura DB_HOST o DATABASE_URL en Render Environment');
    // Crear pool sin conexión para evitar crash
    pool = new Pool();
  } else {
    console.log('   Host:', host);
    
    pool = new Pool({
      host: host,
      user: dbUser || 'postgres',
      password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
      database: process.env.DB_NAME || process.env.PGDATABASE || 'postgres',
      port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432'),
      
      // SSL OBLIGATORIO para Supabase
      ssl: {
        rejectUnauthorized: false,
        require: true
      },
      
      // Forzar IPv4
      family: 4,
      
      // Timeouts
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 5,
    });
  }
}

// Test de conexión asíncrono (no bloqueante)
setTimeout(async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    client.release();
    
    console.log('✅ PostgreSQL conectado exitosamente!');
    console.log('   Hora del servidor:', result.rows[0].current_time);
    console.log('   Versión:', result.rows[0].version.split('\n')[0]);
  } catch (err: any) {
    console.error('❌ Error conectando a PostgreSQL:');
    console.error('   Mensaje:', err.message);
    console.error('   Código:', err.code);
    
    if (databaseUrl) {
      const safeUrl = databaseUrl.replace(/:[^:]*@/, ':****@');
      console.error('   Connection string:', safeUrl);
    } else {
      console.error('   Host:', dbHost);
      console.error('   User:', dbUser);
    }
    
    console.error('\n💡 Solución:');
    console.error('   1. Verifica las credenciales en Supabase');
    console.error('   2. Asegúrate que DATABASE_URL tenga sslmode=require');
    console.error('   3. Revisa que el proyecto Supabase esté activo');
  }
}, 1000);

export default pool;