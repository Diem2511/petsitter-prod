import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Cargo el entorno antes que nada, como debe ser.
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// =========================================================================
// CONFIGURACIÓN AVANZADA DE CONEXIÓN (IGNORANDO RESTRICCIONES DE POOLER)
// =========================================================================
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ FATAL: Falta DATABASE_URL. El sistema no puede operar sin credenciales.');
    process.exit(1);
}

// === ELIMINACIÓN INTELIGENTE DE PARÁMETROS ===
// Mantengo la query string si existe (e.g., ?options=project_id) porque el Pooler la NECESITA.
// Solo quito 'sslmode=require' del string para evitar redundancia y conflictos 
// ya que el objeto 'ssl' de 'pg' ya lo maneja. Esto es un parche que yo diseñé.
if (connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('sslmode=require', '');
}

// Ahora, asegúrate de que no queden '?' colgantes o '&' iniciales después de la limpieza.
connectionString = connectionString.replace(/\?&/g, '?').replace(/&&/g, '&');
if (connectionString.endsWith('?')) {
    connectionString = connectionString.slice(0, -1);
}

const pool = new Pool({
    connectionString: connectionString, 
    ssl: { 
        rejectUnauthorized: false // Ignora la verificación de certificado, bypass clave en Render/Supabase.
    },
    connectionTimeoutMillis: 10000
});

console.log('🚀 Iniciando Backend (MODO SUBVERSIÓN TÁCTICA)...');

// =========================================================================
// MIDDLEWARE Y RUTAS DE PRUEBA (Para verificar el acceso)
// =========================================================================
app.use(cors({
    origin: '*', 
    credentials: true
}));

app.use(express.json());

// Ruta CLAVE: Si funciona, el Pooler fue evadido.
app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        // Consulta simple y directa. Si esto pasa, el canal de datos está abierto.
        const result = await pool.query('SELECT NOW() as hora'); 
        res.json({
            success: true,
            message: '✅ ¡CONEXIÓN TÁCTICA EXITOSA! Pooler neutralizado.',
            hora: result.rows[0].hora,
            connectionStringUsed: connectionString // EXPOSICIÓN de la cadena (solo para debug/prueba)
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