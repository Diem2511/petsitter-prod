import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
// import { healthCheck } from './handlers/healthCheck';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// =========================================================================
// 1. CONFIGURACIÓN DE CONEXIÓN HÍBRIDA (SNI FIX)
// =========================================================================

// Datos extraídos de tus logs anteriores
const SUPABASE_HOST = 'db.qzgdviycwxzmvwtazkis.supabase.co';
const SUPABASE_IP = '54.232.77.43'; // La IP que vimos en tus logs

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERROR CRÍTICO: DATABASE_URL faltante.');
    process.exit(1);
}

// TRUCO DE MAGIA:
// Reemplazamos el dominio por la IP en la cadena de conexión para evitar el DNS de Render
// PERO guardamos el dominio para el certificado SSL
if (connectionString.includes(SUPABASE_HOST)) {
    console.log('🔧 Aplicando parche SNI: Usando IP directa con Hostname en SSL');
    connectionString = connectionString.replace(SUPABASE_HOST, SUPABASE_IP);
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: { 
        rejectUnauthorized: false,
        // ESTA ES LA CLAVE DEL ÉXITO:
        // Aunque nos conectamos a la IP 54.232..., le decimos a Supabase
        // "Hola, vengo a ver a db.qzgdviycwx..."
        servername: SUPABASE_HOST 
    },
    connectionTimeoutMillis: 10000
});

console.log('🚀 Iniciando PetSitter Backend (Modo SNI)...');

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
            message: '✅ ¡CONEXIÓN EXITOSA! (Parche SNI funcionando)',
            data: {
                hora: result.rows[0].hora,
                version: result.rows[0].version
            }
        });
    } catch (error: any) {
        console.error('❌ Error test-db:', error.message);
        res.status(500).json({ success: false, error: error.message });
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
        console.log('✅ CONEXIÓN INICIAL EXITOSA');
    } catch (error: any) {
        console.error('❌ ERROR CONEXIÓN INICIAL:', error.message);
    }
    app.listen(PORT, () => {
        console.log(`📡 Backend escuchando en puerto ${PORT}`);
    });
};

startServer();

export default app;