import express from 'express';
import cors from 'cors';
import { Client } from 'pg';

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Ruta de prueba para ver si el servidor vive
app.get('/', async (req, res) => {
  // Intentamos conectar a Supabase para ver si las credenciales funcionan
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    // Supabase requiere SSL, esto es vital:
    ssl: { rejectUnauthorized: false } 
  });

  try {
    await client.connect();
    const result = await client.query('SELECT NOW()'); // Pide la hora a la DB
    await client.end();
    res.send({ 
      status: 'OK', 
      message: '¡El Backend de PetSitter está vivo!', 
      database_time: result.rows[0].now 
    });
  } catch (err: any) {
    console.error('Error DB:', err);
    res.status(500).send({ 
      status: 'ERROR', 
      message: 'El servidor prende pero falla la DB', 
      error: err.message 
    });
  }
});

// Esto es lo que mantiene encendido a Render
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});