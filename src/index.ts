import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
// Vercel maneja el puerto internamente, pero mantenemos esto para desarrollo local
const PORT = process.env.PORT || 3000; 

// =========================================================================
// CONFIGURACIÓN NEON (LIMPIA Y SIMPLE)
// =========================================================================

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('❌ FATAL: DATABASE_URL no definida');
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: true, // Neon tiene certificados reales, esto es suficiente y seguro
    connectionTimeoutMillis: 5000 // Serverless debe ser rápido
});

console.log('🚀 Inicializando Backend en entorno Serverless...');

// =========================================================================
// MIDDLEWARE
// =========================================================================

app.use(cors({
    origin: '*', // Ajusta esto según necesites para tu frontend
    credentials: true
}));

app.use(express.json());

// =========================================================================
// RUTAS
// =========================================================================

app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW() as hora, version()'); 
        res.json({
            success: true,
            provider: 'Neon Serverless Postgres',
            hora: result.rows[0].hora,
            version: result.rows[0].version
        });
    } catch (error: any) {
        console.error('❌ Error Neon:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', platform: 'Vercel + Neon', timestamp: new Date() });
});

app.get('/', (req, res) => {
    res.json({ message: 'PetSitter Backend en Vercel 🚀' });
});

// =========================================================================
// ADAPTADOR VERCEL (CRÍTICO)
// =========================================================================

// Vercel requiere que EXPORTEMOS la app, no que hagamos app.listen()
// Solo hacemos listen si estamos en local
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`📡 Servidor local corriendo en http://localhost:${PORT}`);
    });
}

// Esta exportación es lo que Vercel busca para convertirlo en Serverless Function
export default app;