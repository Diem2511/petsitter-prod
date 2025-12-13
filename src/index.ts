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
// CONFIGURACIÓN DE CONEXIÓN: RECONSTRUCCIÓN DE HOSTNAME ABSOLUTO (5432)
// =========================================================================
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ FATAL: Falta DATABASE_URL.');
    process.exit(1);
}

// 1. Extraer el Project Reference ID (qzgdviycwxzmvwtazkis)
const projectIdMatch = connectionString.match(/postgres\.([a-z0-9]+)/);
let projectId = projectIdMatch && projectIdMatch[1] ? projectIdMatch[1] : '';

// 2. Reemplazar la parte del host para forzar el formato ProjectID.Region.supabase.co
// y el puerto 5432.

if (projectId) {
    // Busca la parte del dominio (ej: aws-0-sa-east-1.pooler.supabase.com)
    let domainPart = connectionString.match(/@(.+?):/);
    if (domainPart && domainPart[1]) {
        // Limpiamos el dominio de 'pooler' y lo dejamos en el formato básico
        let baseHost = domainPart[1].replace('.pooler.supabase.com', '.supabase.co');
        
        // ¡RECONSTRUCCIÓN FINAL! Inserta el Project ID al inicio del hostname.
        let newHost = `${projectId}.${baseHost.replace(projectId + '.', '')}`; // Asegura que no se duplique
        
        // Reemplaza el host, el puerto y elimina la query string
        let finalConnectionString = connectionString
            .replace(domainPart[1], newHost) // Inyecta el host reconstruido
            .replace(':6543', ':5432')        // Cambia el puerto
            .split('?')[0];                   // Elimina la query string

        // Asigna la cadena final
        connectionString = finalConnectionString;
        
        console.log(`✅ Hostname reconstruido y port 5432 forzado: ${newHost}`);
    }
}


const pool = new Pool({
    connectionString: connectionString, 
    ssl: { 
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000
});

console.log('🚀 Iniciando Backend (MODO ACCESO DIRECTO Y RECONSTRUCCIÓN DE HOSTNAME)...');

// =========================================================================
// MIDDLEWARE Y RUTAS (el resto del código sigue igual)
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
            connectionStringUsed: connectionString 
        });
    } catch (error: any) {
        console.error('❌ Error DB - FALLO TÁCTICO:', error.message);
        res.status(500).json({ success: false, error: error.message, connectionStringUsed: connectionString });
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