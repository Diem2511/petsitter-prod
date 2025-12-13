import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Cargo el entorno antes que nada.
dotenv.config();

// === BYPASS CRÍTICO DE CERTIFICADOS A NIVEL DE STACK ===
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 

const app = express();
const PORT = process.env.PORT || 3000; 

// =========================================================================
// CONFIGURACIÓN DE CONEXIÓN: ¡INYECCIÓN DE LA CLAVE VERIFICADA!
// =========================================================================

// --- ¡CADENA DE CONEXIÓN INYECTADA DIRECTAMENTE Y ÚNICA! ---
const CONNECTION_STRING_INJECTED = 'postgresql://neondb_owner:npg_bN6nDBJig4Vl@ep-proud-dawn-ahel3tta-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// ¡Pool configurado solo con la cadena inyectada!
const pool = new Pool({
    connectionString: CONNECTION_STRING_INJECTED, 
    ssl: { 
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000
});

console.log('🚀 Iniciando Backend (MODO NEON/VERCEL - ¡CLAVE INYECTADA VERIFICADA!)...');

// =========================================================================
// MIDDLEWARE Y RUTAS
// =========================================================================
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Ruta CLAVE: Verificación de acceso.
app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW() as hora'); 
        res.json({
            success: true,
            message: '✅ ¡CANAL DE DATOS ABIERTO! Acceso a Neon con clave nueva.',
            hora: result.rows[0].hora,
            database: 'Neon',
            status: 'Connection established successfully.'
        });
    } catch (error: any) {
        console.error('❌ Error DB - FALLO TÁCTICO:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message, 
            database: 'Neon', 
            note: 'FINAL FAILURE: Check Firewall/Password.' 
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ready to deploy', timestamp: new Date() });
});

app.get('/', (req, res) => {
    res.json({ message: 'PetSitter Backend: Canales Abiertos (Vercel/Neon)' });
});

app.listen(PORT, () => {
    console.log(`📡 Escuchando en puerto ${PORT}`);
});

export default app;