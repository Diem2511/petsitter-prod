import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
// Importa el handler de verificación (asume que existe)
import { healthCheck } from './handlers/healthCheck'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// =========================================================================
// 1. CONFIGURACIÓN DE CONEXIÓN A DB (CRÍTICO)
// =========================================================================

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERROR CRÍTICO: La variable DATABASE_URL no está definida.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: connectionString,
    // SOLUCIÓN FINAL AL PROBLEMA DE CERTIFICADO (self-signed certificate)
    // rejectUnauthorized: false ignora la validación.
    // require: true asegura que la conexión SSL se establece (obligatorio con IP).
    ssl: { 
        rejectUnauthorized: false, 
        require: true 
    }, 
    connectionTimeoutMillis: 10000
});

console.log('🚀 Iniciando PetSitter Backend...');
console.log('🔗 Conectando a Supabase vía DATABASE_URL...');


// =========================================================================
// 2. MIDDLEWARE BÁSICO
// =========================================================================
const allowedOrigins = [
    process.env.FRONTEND_URL_DEV, 
    process.env.FRONTEND_URL_PROD 
];

app.use(cors({
    origin: (origin, callback) => {
        // Permitir peticiones sin origen (ej: Postman, Render Health Checks)
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


// =========================================================================
// 3. ENDPOINT DE PRUEBA DE BASE DE DATOS (CRÍTICO)
// =========================================================================
app.get('/api/test-db', async (req: Request, res: Response) => {
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
        res.status(503).json({
            success: false,
            error: error.message,
            host_intentado: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'Desconocido',
            solucion: 'Error de BD. Si el error es ENETUNREACH/Certificado, la IP en DATABASE_URL es incorrecta o no se pudo ignorar el certificado.'
        });
    }
});


// =========================================================================
// 4. HEALTH CHECK (Completo)
// =========================================================================
app.get('/api/health', healthCheck); 


// =========================================================================
// 5. RUTA RAIZ
// =========================================================================
app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'API de PetSitter Backend - Operacional',
        version: '1.0.0',
        endpoints: {
            test_db: '/api/test-db',
            health: '/api/health',
            // Añade más rutas a medida que las implementes
            login: '/api/auth/login'
        }
    });
});


// =========================================================================
// 6. INICIO DEL SERVIDOR
// =========================================================================
const startServer = async () => {
    // Prueba de conexión CRÍTICA
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
    });
};

startServer();

export default app;