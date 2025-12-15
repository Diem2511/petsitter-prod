import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL no está configurada',
      });
    }

    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT NOW() as current_time, version() as postgres_version`;

    res.status(200).json({
      success: true,
      message: 'Conexión a Neon exitosa ✅',
      database: {
        currentTime: result[0].current_time,
        version: result[0].postgres_version,
      },
    });
  } catch (e) {
    console.error('Error Neon:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      hint: 'Verifica que DATABASE_URL esté correctamente configurada en Vercel',
    });
  }
}