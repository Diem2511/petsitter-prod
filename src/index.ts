import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
// import { healthCheck } from './handlers/healthCheck'; // Descomenta si existe

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// =========================================================================
// 1. CONFIGURACIÓN DE CONEXIÓN A DB (MODO IPv4 FORZADO)
// =========================================================================

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERROR CRÍTICO: La variable DATABASE_URL no está definida.');
    process.exit(1);
}

// Limpiamos la URL por si acaso
if (connectionString.includes('?')) {
    connectionString = connectionString.split('?')[0];
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: { 
        rejectUnauthorized: false 
    },
    connectionTimeoutMillis: 10000,
    // 🔥 ESTA ES LA LÍNEA MÁGICA QUE FALTABA 🔥
    // @ts-ignore <--- Esto calla a TypeScript
    family: 4,     // <--- Esto obliga a Node.js a usar solo IPv4
});

console.log('🚀 Iniciando PetSitter Backend (Modo IPv4 Estricto)...');

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
            callback(null, true); 
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
            message: '✅ ¡CONEXIÓN EXITOSA! (IPv4 + Dominio)',
            data: {
                hora: result.rows[0].hora,
                version: result.rows[0].version
            }
        });
    } catch (error: any) {
        console.error('❌ Error test-db:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

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
        console.error('❌ ERROR CONEXIÓN INICIAL:', error.message);
    }

    app.listen(PORT, () => {
        console.log(`📡 Backend escuchando en puerto ${PORT}`);
    });
};

startServer();

export default app;