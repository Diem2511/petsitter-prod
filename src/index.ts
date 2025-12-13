import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import pool from './config/postgres.config'; // <--- ESTA IMPORTACIÓN AHORA SÍ FUNCIONARÁ

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Endpoint de salud
app.get('/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.status(200).json({ status: 'OK', time: result.rows[0].now });
    } catch (error: any) {
        res.status(500).json({ status: 'ERROR', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor escuchando en el puerto ${port}`);
});