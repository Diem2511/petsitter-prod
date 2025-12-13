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
  // CONFIGURACIÓN DE SEGURIDAD CORREGIDA
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Esto le dice a Node: "Confía en el certificado de Supabase aunque sea auto-firmado"
    }
  });

  try {
    await client.connect();
    const result = await client.query('SELECT NOW()'); 
    await client.end();
    
    res.send({ 
      status: 'OK', 
      message: '¡El Backend de PetSitter está vivo y conectado!', 
      database_time: result.rows[0].now 
    });
  } catch (err: any) {
    console.error('Error DB Detallado:', err);
    res.status(500).send({ 
      status: 'ERROR', 
      message: 'Fallo de certificado SSL', 
      error: err.message 
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});