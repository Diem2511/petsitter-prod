import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Solo permitir GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Configurar cliente S3
    const s3 = new S3Client({
      region: process.env.AWS_REGION || "sa-east-1",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
      tls: false,
    });

    // Probar conexión listando buckets
    const data = await s3.send(new ListBucketsCommand({}));

    // Respuesta exitosa
    res.status(200).json({
      success: true,
      message: "Conexión S3 exitosa",
      buckets: data.Buckets?.length || 0,
      bucketsNames: data.Buckets?.map(b => b.Name) || [],
    });
  } catch (e: any) {
    // Error en la conexión
    console.error("Error S3:", e);
    res.status(500).json({
      success: false,
      error: e.message,
      code: e.Code || "UNKNOWN",
    });
  }
}