import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Validación: Si no hay URL, avisamos para no perder tiempo
if (!process.env.DATABASE_URL) {
    console.error('❌ FATAL: No existe la variable DATABASE_URL');
}

// Configuración directa para Supabase
const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Indispensable para Render + Supabase
    }
};

export const pool = new Pool(poolConfig);

// Test de conexión inmediato al arrancar
pool.query('SELECT NOW()')
    .then(() => console.log('✅ CONEXIÓN A SUPABASE EXITOSA (DB Arriba)'))
    .catch(err => {
        console.error('❌ ERROR CRÍTICO CONECTANDO A SUPABASE:', err.message);
        // Opcional: ver si la URL está llegando (ocultando el password)
        console.log('URL usada (check):', process.env.DATABASE_URL ? 'Si existe' : 'No existe');
    });