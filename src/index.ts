import express from 'express';
import cors from 'cors';
import { Client } from 'pg'; // Usamos Client para prueba directa
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
  // 1. Desarmamos la URL para ver si la estamos leyendo bien (sin mostrar la password)
  const dbUrl = process.env.DATABASE_URL;
  
  // 2. Configuración "Nuclear" para SSL
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false, // Ignorar validación de firma
      requestCert: true,         // Solicitar certificado
      agent: false               // No usar agente HTTP
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
      code: err.code,
      details: err.message
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});