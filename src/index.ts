import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// =========================================================================
// CONFIGURACIÓN ESTÁNDAR PARA POOLER
// =========================================================================

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ FATAL: Falta DATABASE_URL.');
    process.exit(1);
}

// Limpiamos parámetros extras de la URL para que no choquen con la config manual
if (connectionString.includes('?')) {
    connectionString = connectionString.split('?')[0];
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: { 
        rejectUnauthorized: false // Esto es lo único necesario para Supabase
    },
    connectionTimeoutMillis: 10000 // 10 segundos de espera
});

console.log('🚀 Iniciando Backend (Modo Pooler)...');

// =========================================================================
// MIDDLEWARE Y RUTAS
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

app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW() as hora'); 
        res.json({
            success: true,
            message: '✅ ¡CONEXIÓN EXITOSA VÍA POOLER!',
            hora: result.rows[0].hora
        });
    } catch (error: any) {
        console.error('❌ Error DB:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'petsitter-backend' });
});

app.get('/', (req, res) => {
    res.json({ message: 'PetSitter Backend Online' });
});

const startServer = async () => {
    try {
        await pool.query('SELECT 1');
        console.log('✅ CONEXIÓN INICIAL EXITOSA');
    } catch (error: any) {
        console.error('❌ ERROR CONEXIÓN INICIAL:', error.message);
    }
    app.listen(PORT, () => {
        console.log(`📡 Escuchando en puerto ${PORT}`);
    });
};

startServer();

export default app;