import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
// === IMPORTS ADICIONALES PARA EL TEST DE S3 ===
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
// =============================================

// Cargo el entorno antes que nada.
dotenv.config();

// === BYPASS CRÍTICO DE CERTIFICADOS A NIVEL DE STACK ===
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 

const app = express();
const PORT = process.env.PORT || 3000; 

// =========================================================================
// CONFIGURACIÓN DE CONEXIÓN: BASE DE DATOS (NEON)
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

// =========================================================================
// MIDDLEWARE Y RUTAS BÁSICAS
// =========================================================================
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// =========================================================================
// RUTA DE HEALTH CHECK COMPLETO (FASE 3 - TEST DB & S3)
// =========================================================================
app.get('/api/health', async (req: Request, res: Response) => {
    let dbStatus = 'failure';
    let s3Status = 'failure';
    let s3Error = null;

    // 1. Prueba de Conexión a Base de Datos (PostgreSQL/Neon)
    try {
        await pool.query('SELECT NOW()');
        dbStatus = 'success';
    } catch (e: any) {
        dbStatus = 'failure';
    }

    // 2. Prueba de Conexión a Storage (S3 o Compatible)
    try {
        const s3Client = new S3Client({
            endpoint: process.env.S3_ENDPOINT,
            region: process.env.AWS_REGION || 'us-east-1', 
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            }
        });
        // Intentamos listar los buckets para probar la autenticación
        await s3Client.send(new ListBucketsCommand({})); 
        s3Status = 'success';
    } catch (e: any) {
        s3Status = 'failure';
        // Solo enviamos el mensaje del error para no exponer toda la pila de errores
        s3Error = e.message ? e.message.substring(0, 150) + '...' : 'Unknown S3 error';
    }

    const overallStatus = (dbStatus === 'success' && s3Status === 'success') ? 'ok' : 'degraded';

    res.json({
        status: overallStatus,
        timestamp: new Date(),
        dependencies: {
            database: {
                status: dbStatus,
                type: 'PostgreSQL/Neon'
            },
            storage_s3: {
                status: s3Status,
                error: s3Error || 'N/A'
            }
        }
    });
});

// =========================================================================
// RUTAS DE DIAGNÓSTICO (Existentes)
// =========================================================================

// Ruta CLAVE: Verificación de acceso DB.
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


app.get('/', (req, res) => {
    res.json({ message: 'PetSitter Backend: Canales Abiertos (Vercel/Neon)' });
});

app.listen(PORT, () => {
    console.log(`📡 Escuchando en puerto ${PORT}`);
});

export default app;