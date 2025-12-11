import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde el archivo .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Configuracion de la Pool de PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

/**
 * Funcion Wrapper para ejecutar consultas a la DB.
 * @param text La consulta SQL con placeholders ($1, $2, etc.)
 * @param params Los parametros a sustituir en la consulta
 * @returns El resultado de la consulta.
 */
export const query = (text: string, params?: any[]) => {
    console.log('SQL Executing:', text, params);
    return pool.query(text, params);
};

// Testear la conexion al inicio
pool.connect()
    .then(client => {
        console.log('Conexion a PostgreSQL exitosa!');
        client.release();
    })
    .catch(err => {
        console.error('Error al conectar con PostgreSQL:', err.stack);
        console.error('Asegurate que el contenedor "petsitter-postgres" este corriendo.');
    });
