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
// CONFIGURACIÓN DE CONEXIÓN: VOLVER A USAR DATABASE_URL
// =========================================================================

// Usamos la variable de entorno que DEBES haber corregido en Vercel
const CONNECTION_STRING = process.env.DATABASE_URL;

if (!CONNECTION_STRING) {
    throw new Error('FATAL: DATABASE_URL no está configurada.');
}

const pool = new Pool({
    connectionString: CONNECTION_STRING, 
    ssl: { 
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000
});

console.log('🚀 Iniciando Backend (MODO NEON/VERCEL - PRODUCCIÓN LIMPIA)...');

// ... (Resto del código de middleware y rutas)

// Ruta CLAVE: Verificación de acceso.
app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW() as hora'); 
        res.json({
            success: true,
            message: '✅ ¡CANAL DE DATOS ABIERTO! Conexión Establecida.',
            hora: result.rows[0].hora,
            database: 'Neon',
            status: 'Connection established successfully.'
        });
    } catch (error: any) {
        console.error('❌ Error DB - FALLO DE AUTENTICACIÓN:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message, 
            database: 'Neon', 
            note: 'FINAL FAILURE: Check DATABASE_URL password in Vercel.' 
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