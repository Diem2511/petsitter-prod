import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
// Si tienes el handler de healthCheck, descoméntalo, si no, usa el inline de abajo
// import { healthCheck } from './handlers/healthCheck'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// =========================================================================
// 1. CONFIGURACIÓN DE CONEXIÓN A DB (BLINDADA)
// =========================================================================

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERROR CRÍTICO: La variable DATABASE_URL no está definida.');
    process.exit(1);
}

// TRUCO DE MAGIA: Limpiamos la URL para evitar conflictos
// Si la URL viene con '?sslmode=require', lo quitamos para que mande nuestro objeto config
if (connectionString.includes('?')) {
    console.log('🧹 Limpiando parámetros conflictivos de DATABASE_URL...');
    connectionString = connectionString.split('?')[0]; 
}

const pool = new Pool({
    connectionString: connectionString,
    // AQUÍ ESTÁ LA SOLUCIÓN AL ERROR "SELF-SIGNED CERTIFICATE"
    ssl: { 
        rejectUnauthorized: false // <--- ESTO ES LO QUE SUPABASE NECESITA
    }, 
    connectionTimeoutMillis: 10000
});

console.log('🚀 Iniciando PetSitter Backend...');

// =========================================================================
// 2. MIDDLEWARE
// =========================================================================
const allowedOrigins = [
    process.env.FRONTEND_URL_DEV || 'http://localhost:5173', 
    process.env.FRONTEND_URL_PROD 
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            console.log('⚠️ Bloqueo CORS para origen:', origin);
            callback(null, true); // Modo permisivo temporal para evitar bloqueos en pruebas
        }
    },
    credentials: true
}));

app.use(express.json());

// =========================================================================
// 3. ENDPOINTS
// =========================================================================

app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW() as hora, version() as version'); 
        res.json({
            success: true,
            message: '✅ ¡CONEXIÓN DB EXITOSA!',
            data: {
                hora: result.rows[0].hora,
                version: result.rows[0].version
            }
        });
    } catch (error: any) {
        console.error('❌ Error test-db:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            hint: 'El error self-signed certificate se arregla con rejectUnauthorized: false'
        });
    }
});

// Health check simple y robusto
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'petsitter-backend', timestamp: new Date() });
});

app.get('/', (req, res) => {
    res.json({ message: 'PetSitter Backend Online 🚀' });
});

// =========================================================================
// 4. ARRANQUE
// =========================================================================
const startServer = async () => {
    try {
        await pool.query('SELECT 1');
        console.log('✅ CONEXIÓN INICIAL A BASE DE DATOS: EXITOSA');
    } catch (error: any) {
        console.error('❌ ERROR CONEXIÓN INICIAL DB:', error.message);
        // No hacemos process.exit(1) para que el servidor web siga vivo y podamos diagnosticar
    }

    app.listen(PORT, () => {
        console.log(`📡 Backend escuchando en puerto ${PORT}`);
    });
};

startServer();

export default app;