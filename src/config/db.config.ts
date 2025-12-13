import pool from './postgres.config';

// Simulamos la estructura que tus handlers antiguos esperan
export const dbConfig = {
    // Si tus handlers hacen "const pool = dbConfig.pool", esto funcionará:
    pool: pool,
    
    // Si hacen "dbConfig.query(...)", esto funcionará:
    query: (text: string, params?: any[]) => pool.query(text, params),
    
    // Propiedades de configuración "dummy" para engañar a TypeScript
    // si intentan pasar dbConfig al constructor de Pool
    host: 'localhost',
    user: 'postgres',
    password: '',
    database: 'postgres'
};