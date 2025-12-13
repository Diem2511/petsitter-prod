import './debug-database';
import express from 'express';
import cors from 'cors';
import pool from './config/postgres-fixed';

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Endpoint de prueba SIMPLE
app.get('/api/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as db_time');
    res.json({
      success: true,
      message: 'Conexión a PostgreSQL exitosa!',
      dbTime: result.rows[0].db_time,
      host: 'db.qzgdviycwxzmvwtazkis.supabase.co'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      solution: 'Verificar DATABASE_URL en Render Environment'
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    service: 'PetSitter Backend (FIXED)',
    test: '/api/test',
    status: 'running'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor FIXED en puerto ${PORT}`);
});