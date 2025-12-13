import { poolConfig } from './postgres.config';
import pool from './postgres.config';

// ¡ESTA ES LA MAGIA!
// Exportamos la "configuración" cruda, porque tus handlers (chat.ts, etc.)
// seguramente están haciendo "new Pool(dbConfig)".
export const dbConfig = poolConfig;

// También exportamos el pool por si algún archivo lo importa directo
export { pool };