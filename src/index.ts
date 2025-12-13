import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
// import { healthCheck } from './handlers/healthCheck';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// =========================================================================
// CONFIGURACIÓN LIMPIA Y ESTÁNDAR
// =========================================================================

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ FATAL: Falta DATABASE_URL.');
    process.exit(1);
}

// Limpieza básica de parámetros para evitar conflictos
if (connectionString.includes('?')) {
    connectionString = connectionString.split('?')[0];
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: { 
        rejectUnauthorized: false // Único requisito real de Supabase
    },
    connectionTimeoutMillis: 10000
});

console.log('🚀 Iniciando Backend (Configuración Estándar)...');

// =========================================================================
// MIDDLEWARE Y RUTAS
// =========================================================================

app.use(cors({
    origin: '*', // Permisivo para debug
    credentials: true
}));

app.use(express.json());

app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW() as hora'); 
        res.json({
            success: true,
            message: '✅ ¡CONEXIÓN EXITOSA CON POOLER!',
            hora: result.rows[0].hora
        });
    } catch (error: any) {
        console.error('❌ Error DB:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/', (req, res) => {
    res.json({ message: 'PetSitter Backend Online' });
});

app.listen(PORT, () => {
    console.log(`📡 Escuchando en puerto ${PORT}`);
});

export default app;