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
// CONFIGURACIÓN DE CONEXIÓN: CORRECCIÓN DE HOSTNAME FINAL (5432)
// =========================================================================
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ FATAL: Falta DATABASE_URL.');
    process.exit(1);
}

// 1. ANULACIÓN DEL POOLER: Reemplaza el puerto 6543 (Pooler) por 5432 (Motor Directo)
let finalConnectionString = connectionString.replace(':6543', ':5432');

// 2. Quitamos cualquier 'sslmode=require' del string
if (finalConnectionString.includes('sslmode=require')) {
    finalConnectionString = finalConnectionString.replace('sslmode=require', '');
}

// 3. Limpiamos el subdominio 'pooler' si está presente, PERO CON MÁS CUIDADO.
// Solo quitamos '.pooler' para dejar el subdominio correcto (e.g., 'aws-0-sa-east-1.supabase.co')
finalConnectionString = finalConnectionString.replace('.pooler.', '.');


// 4. Limpiamos cualquier query string remanente (incluyendo el 'options=...')
finalConnectionString = finalConnectionString.split('?')[0]; 

const pool = new Pool({
    connectionString: finalConnectionString, 
    ssl: { 
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000
});

console.log('🚀 Iniciando Backend (MODO ACCESO DIRECTO Y CORRECCIÓN DE DNS)...');

// =========================================================================
// MIDDLEWARE Y RUTAS
// =========================================================================
app.use(cors({
    origin: '*', 
    credentials: true
}));

app.use(express.json());

// Ruta CLAVE: Verificación de acceso.
app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW() as hora'); 
        res.json({
            success: true,
            message: '✅ ¡CONEXIÓN TÁCTICA EXITOSA! El canal está libre para la subversión.',
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