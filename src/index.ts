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
// CONFIGURACIÓN DE CONEXIÓN: HOSTNAME DEFINITIVO (USO DE GUION)
// =========================================================================
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ FATAL: Falta DATABASE_URL.');
    process.exit(1);
}

// 1. ANULACIÓN DEL POOLER: Reemplaza el puerto 6543 (Pooler) por 5432 (Motor Directo)
let finalConnectionString = connectionString.replace(':6543', ':5432');

// 2. Extraer el host actual
const hostMatch = finalConnectionString.match(/@(.+?):/);

if (hostMatch && hostMatch[1]) {
    let currentHost = hostMatch[1];
    
    // Extraer el Project ID
    const projectIdMatch = finalConnectionString.match(/postgres\.([a-z0-9]+)/);
    let projectId = projectIdMatch && projectIdMatch[1] ? projectIdMatch[1] : '';

    if (projectId) {
        // CORRECCIÓN FINAL: Cambiamos el subdominio complejo a la forma genérica de Supabase:
        // project-db.region.supabase.co
        let newHost = currentHost
            .replace('.pooler.', '.') // Limpiamos 'pooler'
            .replace('.db.', '.');    // Limpiamos '.db' si existe
        
        // Buscamos el inicio de la región (ej: aws-0-sa-east-1)
        let regionIndex = newHost.indexOf('aws-0');
        if (regionIndex === -1) regionIndex = newHost.indexOf('db-'); // Otra convención
        
        if (regionIndex > 0) {
            // Reconstruimos: quitamos el ID original y lo ponemos con el sufijo '-db'
            let regionPart = newHost.substring(regionIndex);
            newHost = `${projectId}-db.${regionPart}`;
        } else {
             // Fallback a la reconstrucción anterior si no se encuentra la región
             newHost = currentHost.replace('.pooler.supabase.com', '.db.supabase.com').replace('.db.', '.');
        }

        // Reemplazamos el host en la cadena
        finalConnectionString = finalConnectionString.replace(currentHost, newHost);
    }
}

// 3. Limpiamos 'sslmode' y 'query string' remanente
finalConnectionString = finalConnectionString.replace('sslmode=require', '').split('?')[0];

const pool = new Pool({
    connectionString: finalConnectionString, 
    ssl: { 
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000
});

console.log('🚀 Iniciando Backend (MODO DE ÚLTIMA CORRECCIÓN DE HOSTNAME)...');

// =========================================================================
// MIDDLEWARE Y RUTAS (el resto del código sigue igual)
// =========================================================================
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW() as hora'); 
        res.json({
            success: true,
            message: '✅ ¡CONEXIÓN TÁCTICA EXITOSA! ¡EL CANAL DE DATOS ESTÁ ABIERTO!',
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