import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL no configurada',
      });
    }

    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT NOW() as time`;

    res.status(200).json({
      success: true,
      message: 'Funciona! ✅',
      time: result[0].time,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
}