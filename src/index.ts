import express from 'express';
import cors from 'cors';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
  // Configuración LIMPIA que TypeScript acepta
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Esta es la única línea vital para evitar el error de certificado
    }
  });

  try {
    await client.connect();
    const result = await client.query('SELECT NOW() as now');
    await client.end();
    
    res.send({ 
      status: 'OK', 
      message: '¡CONEXIÓN EXITOSA! (SSL Bypass activado)', 
      time: result.rows[0].now 
    });
  } catch (err: any) {
    console.error('Error detallado:', err);
    res.status(500).send({ 
      status: 'ERROR', 
      message: 'Fallo de conexión DB', 
      code: err.code || 'UNKNOWN',
      details: err.message
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});