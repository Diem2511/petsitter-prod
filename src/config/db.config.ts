import pool from './postgres.config';

// Re-exportamos el pool y la config para que los otros archivos no fallen
export const dbConfig = {
    // Si algún archivo viejo busca propiedades específicas, aquí simulamos o exponemos
    pool: pool
};

export { pool };