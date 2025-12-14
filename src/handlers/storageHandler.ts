import { Request, Response } from 'express';
import { S3Client, PutObjectCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import multer from 'multer';

// --- Configuración de AWS S3 (Supabase Storage) ---
// NOTA: La región es a menudo 'sa-east-1' o similar para Supabase.
const s3ClientConfig = {
    region: process.env.AWS_REGION || 'sa-east-1', 
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    // CRÍTICO: Desactivar la validación de certificados para S3 de Supabase
    tls: false, 
    forcePathStyle: true,
};

const s3Client = new S3Client(s3ClientConfig);
const BUCKET_NAME = process.env.BUCKET_NAME || 'petsitter-evidence';

// --- Middleware para manejar archivos (Multer) ---
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({ storage: storage });

// ------------------------------------------------------------------
// HANDLER 1: Subida de Prueba (POST /api/test-upload)
// ------------------------------------------------------------------
export const uploadTest = async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se adjuntó ningún archivo para la prueba.' });
    }

    const file = req.file;
    const key = `test-upload-${Date.now()}-${file.originalname}`;

    const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: key, 
        Body: file.buffer, 
        ContentType: file.mimetype,
        ACL: 'public-read' as const, 
    };

    try {
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);

        const fileUrl = `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${key}`;

        res.json({
            success: true,
            message: '✅ Conexión a Supabase Storage confirmada.',
            fileName: key,
            location: fileUrl,
            bucket: BUCKET_NAME
        });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: '❌ FALLO CRÍTICO: No se pudo conectar/autenticar con Supabase Storage.',
            error: error.message,
            solucion: 'Revisa las variables AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_ENDPOINT y BUCKET_NAME.'
        });
    }
};

// ------------------------------------------------------------------
// HANDLER 2: Prueba de Conexión de un clic (GET /api/test-s3)
// ------------------------------------------------------------------
export const testS3Connection = async (req: Request, res: Response) => {
    try {
        // Ejecutamos un comando simple (ListBuckets) para probar las credenciales
        const result = await s3Client.send(new ListBucketsCommand({}));

        res.json({
            success: true,
            message: '✅ Credenciales y Conexión S3/Storage confirmadas.',
            bucketsFound: result.Buckets?.length || 0,
            status: 'Credentials OK'
        });

    } catch (error: any) {
        console.error('❌ Error S3:', error.message);
        res.status(500).json({
            success: false,
            message: '❌ FALLO CRÍTICO: No se pudo autenticar con Supabase Storage.',
            error: error.message,
            solucion: 'Revisa las variables AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY y S3_ENDPOINT.'
        });
    }
};