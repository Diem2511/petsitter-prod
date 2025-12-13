import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import pool from './config/postgres.config'; // Importamos la pool que acabamos de crear

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// --- ENDPOINT DE SALUD (Health Check) ---
// Render usa esto para saber si tu app está lista
app.get('/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.status(200).json({ 
            status: 'OK', 
            db_status: 'Connected', 
            time: result.rows[0].now 
        });
    } catch (error: any) {
        console.error('Health check failed:', error);
        res.status(500).json({ 
            status: 'ERROR', 
            db_status: 'Disconnected', 
            error: error.message 
        });
    }
});

// --- RUTA RAÍZ (Diagnóstico visible) ---
app.get('/', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    client.release(); // Importante liberar el cliente

    res.send({ 
      status: 'OK', 
      message: '¡El Backend de PetSitter está vivo!', 
      environment: process.env.NODE_ENV || 'development',
      database_version: result.rows[0].version
    });
  } catch (err: any) {
    res.status(500).send({ 
      status: 'ERROR', 
      message: 'El servidor prende pero falla la DB', 
      error: err.message 
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${port}`);
  console.log(`ipv4first flag debería estar activa.`);
});