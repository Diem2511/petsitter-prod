import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Cargo el entorno antes que nada.
dotenv.config();

// === BYPASS CRÍTICO DE CERTIFICADOS A NIVEL DE STACK ===
// Esto ignora el error de 'self-signed certificate' en todo el proceso Node.js.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 

const app = express();
const PORT = process.env.PORT || 10000;

// =========================================================================
// CONFIGURACIÓN DE CONEXIÓN: ATAQUE DE REDIRECCIÓN DE PUERTO (BYPASS DE POOLER)
// =========================================================================
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ FATAL: Falta DATABASE_URL.');
    process.exit(1);
}

// 1. ANULACIÓN DEL POOLER: Reemplaza el puerto 6543 (Pooler) por 5432 (Motor Directo)
let finalConnectionString = connectionString.replace(':6543', ':5432');

// 2. Quitamos cualquier 'sslmode=require' del string, ya que el motor directo lo maneja mejor
// con el objeto 'ssl' de 'pg' y no necesitamos la ofuscación del Pooler.
if (finalConnectionString.includes('sslmode=require')) {
    finalConnectionString = finalConnectionString.replace('sslmode=require', '');
}

// 3. Anulamos el dominio 'pooler' por el dominio directo si está presente
finalConnectionString = finalConnectionString.replace('.pooler.supabase.com', '.supabase.co');


// 4. Limpiamos cualquier query string remanente, ya que el motor directo la ignora
finalConnectionString = finalConnectionString.split('?')[0]; 

const pool = new Pool({
    connectionString: finalConnectionString, // ¡Usamos la cadena sin Pooler!
    ssl: { 
        rejectUnauthorized: false // Ignora el certificado auto-firmado
    },
    connectionTimeoutMillis: 10000
});

console.log('🚀 Iniciando Backend (MODO DE REDIRECCIÓN Y BYPASS DE POOLER TÁCTICO)...');

// =========================================================================
// MIDDLEWARE Y RUTAS
// =========================================================================
app.use(cors({
    origin: '*', 
    credentials: true
}));

app.use(express.json());

// Ruta CLAVE: Verificación de acceso al motor directo.
app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW() as hora'); 
        res.json({
            success: true,
            message: '✅ ¡CONEXIÓN TÁCTICA EXITOSA! Acceso directo al motor Postgres.',
            hora: result.rows[0].hora,
            connectionStringUsed: finalConnectionString 
        });
    } catch (error: any) {
        console.error('❌ Error DB - FALLO TÁCTICO:', error.message);
        res.status(500).json({ success: false, error: error.message, connectionStringUsed: finalConnectionString });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ready to deploy', timestamp: new Date() });
});

app.get('/', (req, res) => {
    res.json({ message: 'PetSitter Backend: Canales Abiertos' });
});

app.listen(PORT, () => {
    console.log(`📡 Escuchando en puerto ${PORT}`);
});

export default app;