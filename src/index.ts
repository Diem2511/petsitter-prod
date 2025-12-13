import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// 1. CONFIGURACIÓN HARCODEADA DE SUPABASE (USA TU CONTRASEÑA REAL)
const connectionString = 'postgresql://postgres:riXQZxxxxxx4o3Ne@db.qzgdviycwxzmvwtazkis.supabase.co:5432/postgres?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

console.log('🚀 Iniciando PetSitter Backend...');
console.log('🔗 Conectando a Supabase...');

// 2. MIDDLEWARE BÁSICO
app.use(cors());
app.use(express.json());

// 3. ENDPOINT DE PRUEBA DE BASE DE DATOS (EL MÁS IMPORTANTE)
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as hora, version() as version');
    res.json({
      success: true,
      message: '✅ ¡Conexión a la base de datos exitosa!',
      data: {
        hora_servidor: result.rows[0].hora,
        version_postgres: result.rows[0].version.split('\n')[0]
      }
    });
  } catch (error: any) {
    console.error('❌ Error en /api/test-db:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      host_intentado: 'db.qzgdviycwxzmvwtazkis.supabase.co',
      solucion: 'Verifica la contraseña y que el proyecto Supabase esté activo.'
    });
  }
});

// 4. HEALTH CHECK (Para Render y monitoreo)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'petsitter-backend',
    timestamp: new Date().toISOString()
  });
});

// 5. RUTA RAIZ
app.get('/', (req, res) => {
  res.json({
    message: 'API de PetSitter Backend',
    version: '1.0.0',
    endpoints: {
      test_db: '/api/test-db',
      health: '/api/health'
    }
  });
});

// 6. INICIO DEL SERVIDOR CON VERIFICACIÓN
const startServer = async () => {
  // Primero, probamos la conexión a la base de datos
  try {
    await pool.query('SELECT 1');
    console.log('✅ Prueba de conexión a PostgreSQL exitosa.');
  } catch (error: any) {
    console.error('❌ ERROR CRÍTICO: No se pudo conectar a la base de datos.');
    console.error('   Motivo:', error.message);
    console.error('   Asegúrate de que la contraseña en index.ts sea correcta.');
    // No salimos del proceso, para que el servidor al menos arranque y podamos ver el error en /api/test-db
  }

  // Lanzamos el servidor
  app.listen(PORT, () => {
    console.log(`📡 Servidor escuchando en el puerto ${PORT}`);
    console.log(`🌐 URL pública: https://petsitter-prod.onrender.com`);
    console.log(`🩺 Health check: https://petsitter-prod.onrender.com/api/health`);
    console.log(`🔧 Prueba de BD: https://petsitter-prod.onrender.com/api/test-db`);
  });
};

startServer();

export default app;