import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar que existe la variable de entorno
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL no está configurada',
      });
    }

    // Conectar a Neon
    const sql = neon(process.env.DATABASE_URL);

    // Hacer una query simple de prueba
    const result = await sql`SELECT NOW() as current_time, version() as postgres_version`;

    // Respuesta exitosa
    res.status(200).json({
      success: true,
      message: 'Conexión a Neon exitosa ✅',
      database: {
        currentTime: result[0].current_time,
        version: result[0].postgres_version,
      },
    });
  } catch (e: any) {
    // Error en la conexión
    console.error('Error Neon:', e);
    res.status(500).json({
      success: false,
      error: e.message,
      hint: 'Verifica que DATABASE_URL esté correctamente configurada en Vercel',
    });
  }
}