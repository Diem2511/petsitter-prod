// src/config/db.config.ts
import { Pool } from 'pg';

// Usamos la misma configuración que en index.ts
const connectionString = 'postgresql://postgres:riXQZxxxxxx4o3Ne@db.qzgdviycwxzmvwtazkis.supabase.co:5432/postgres?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

// Exportamos como 'dbConfig' para compatibilidad con tus handlers antiguos
export const dbConfig = {
  pool: pool,
  query: pool.query.bind(pool),
  execute: pool.query.bind(pool),
  getConnection: async () => {
    const client = await pool.connect();
    return {
      query: client.query.bind(client),
      release: () => client.release(),
      end: () => client.release()
    };
  }
};

// También exportamos el pool directamente por si acaso
export { pool };
export default pool;