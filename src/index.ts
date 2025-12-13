import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Cargo el entorno antes que nada.
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// =========================================================================
// CONFIGURACIÓN DE CONEXIÓN: DOBLE INYECCIÓN (TENANT ID + SSL MODE)
// =========================================================================
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ FATAL: Falta DATABASE_URL. El sistema no puede operar sin credenciales.');
    process.exit(1);
}

// 1. Obtener la cadena de conexión limpia (sin la query string si la tuviera, Render la elimina)
const cleanConnectionUrl = connectionString.split('?')[0];

// 2. Extraer el Project Reference ID del nombre de usuario.
const userPart = cleanConnectionUrl.split('//')[1].split(':')[0];
const projectIdMatch = userPart.match(/^postgres\.([a-z0-9]+)/);

let finalConnectionString = cleanConnectionUrl;

if (projectIdMatch && projectIdMatch[1]) {
    const projectId = projectIdMatch[1];
    
    // 1. INYECCIÓN PRINCIPAL: Project ID (necesario para el Pooler)
    finalConnectionString = `${cleanConnectionUrl}?options=project-id%3D${projectId}`; 
    
    // 2. INYECCIÓN SECUNDARIA: sslmode (necesario para el proxy/firewall de Render)
    // El Pooler es tan estúpido que necesita ver esto aunque lo manejemos con 'ssl: {...}'
    finalConnectionString += `&sslmode=require`; 

    console.log(`✅ Project ID [${projectId}] detectado. DOBLE INYECCIÓN de 'options' y 'sslmode' forzada. Cadena lista.`);
} else {
    console.error('❌ ERROR CLASIFICADO: No se pudo parsear el Project ID para la inyección.');
    process.exit(1);
}

// 4. Crear el Pool con la cadena de conexión con la Doble Inyección.
const pool = new Pool({
    connectionString: finalConnectionString, // ¡Esto es lo crucial!
    ssl: { 
        rejectUnauthorized: false 
    },
    connectionTimeoutMillis: 10000
});

console.log('🚀 Iniciando Backend (MODO DE DOBLE INYECCIÓN TÁCTICA)...');

// =========================================================================
// MIDDLEWARE Y RUTAS
// =========================================================================
app.use(cors({
    origin: '*', 
    credentials: true
}));

app.use(express.json());

// Ruta CLAVE: Verificación de acceso al Pooler.
app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW() as hora'); 
        res.json({
            success: true,
            message: '✅ ¡CONEXIÓN TÁCTICA EXITOSA! Pooler neutralizado por DOBLE INYECCIÓN.',
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