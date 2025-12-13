import express, { Request, Response } from 'express'; // Añadido Response, Request para tipos
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
// Importa el handler de verificación que hicimos antes
import { healthCheck } from './handlers/healthCheck'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// =========================================================================
// 1. CORRECCIÓN CRÍTICA: USAR VARIABLE DE ENTORNO 'DATABASE_URL' de RENDER
// =========================================================================

// Usaremos la variable de entorno DATABASE_URL que configuraste en Render.
// Nota: Para este test inicial, usaremos la URI del pooler que ya has configurado.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERROR CRÍTICO: La variable DATABASE_URL no está definida.');
    process.exit(1); // Finaliza si la variable más crítica no está presente.
}

const pool = new Pool({
    connectionString: connectionString,
    // La conexión a Supabase SIEMPRE requiere SSL
    ssl: { rejectUnauthorized: false }, 
    connectionTimeoutMillis: 10000
});

console.log('🚀 Iniciando PetSitter Backend...');
console.log('🔗 Conectando a Supabase vía DATABASE_URL...');


// 2. MIDDLEWARE BÁSICO
// CORRECCIÓN: Usaremos una configuración CORS para producción (usa las variables de entorno)
const allowedOrigins = [
    process.env.FRONTEND_URL_DEV, // http://localhost:3000
    process.env.FRONTEND_URL_PROD // https://dominio-final.com
];

app.use(cors({
    origin: (origin, callback) => {
        // Permitir peticiones sin origen (como Postman/cURL/Deploy Preview)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}));

app.use(express.json());

// 3. ENDPOINT DE PRUEBA DE BASE DE DATOS (CRÍTICO)
app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        // Testeamos la conexión y el pool
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
        res.status(503).json({ // Usar 503 Service Unavailable
            success: false,
            error: error.message,
            host_intentado: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'Desconocido',
            solucion: 'Verifica la contraseña en la variable DATABASE_URL y que el pooler de Supabase esté activo.'
        });
    }
});

// 4. HEALTH CHECK (Completo)
// Este endpoint debe llamar al script de verificación que hicimos antes.
// Si ya tienes un archivo handlers/healthCheck.ts, usa ese.
// Si no lo has creado, usaremos la versión simplificada de tu código anterior.
app.get('/api/health', healthCheck); 

// 5. RUTA RAIZ
app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'API de PetSitter Backend - Operacional',
        version: '1.0.0',
        endpoints: {
            test_db: '/api/test-db',
            health: '/api/health',
            login: '/api/auth/login' // Asumiendo tu primera ruta funcional
        }
    });
});

// 6. INICIO DEL SERVIDOR
const startServer = async () => {
    // Prueba de conexión CRÍTICA antes de escuchar
    try {
        await pool.query('SELECT 1');
        console.log('✅ Prueba de conexión a PostgreSQL exitosa.');
    } catch (error: any) {
        console.error('❌ ERROR CRÍTICO: No se pudo conectar a la base de datos.');
        console.error('     Motivo:', error.message);
        console.log('     Continuando el arranque para debug/diagnóstico...');
    }

    // Lanzamos el servidor
    app.listen(PORT, () => {
        console.log(`📡 Servidor escuchando en el puerto ${PORT}`);
        console.log(`🌐 URL pública: https://petsitter-prod.onrender.com`);
        console.log(`🩺 Health check (DB + S3): https://petsitter-prod.onrender.com/api/health`);
        console.log(`🔧 Prueba de BD: https://petsitter-prod.onrender.com/api/test-db`);
    });
};

startServer();

export default app;