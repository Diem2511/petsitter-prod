import { Request, Response } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';

// --- Configuración de AWS S3 (Supabase Storage) ---
const s3Client = new S3Client({
    region: 'sa-east-1', // Reemplaza con tu región si es diferente
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    // SOLUCIÓN CRÍTICA: Desactivar la validación de certificados para S3
    // Esto es necesario para que funcione con el endpoint custom de Supabase
    tls: false, 
    forcePathStyle: true,
});

const BUCKET_NAME = process.env.BUCKET_NAME || 'petsitter-evidence';

// --- Middleware para manejar archivos (Multer) ---
// Usaremos la memoria para almacenar temporalmente el archivo antes de subirlo a S3
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({ storage: storage });

// --- Handler de la ruta de subida ---
export const uploadTest = async (req: Request, res: Response) => {
    // 1. Verificar el archivo
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se adjuntó ningún archivo para la prueba.' });
    }

    const file = req.file;
    const key = `test-upload-${Date.now()}-${file.originalname}`;

    // 2. Configurar el comando de subida a S3
    const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: key, // Nombre del archivo en el bucket
        Body: file.buffer, // El buffer de datos del archivo
        ContentType: file.mimetype,
        ACL: 'public-read' as const, // Puedes cambiar esto según tus permisos
    };

    try {
        // 3. Subir el archivo
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);

        // 4. Generar URL de confirmación (asumiendo que es pública)
        const fileUrl = `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${key}`;

        console.log(`✅ Archivo subido exitosamente: ${key}`);

        res.json({
            success: true,
            message: '✅ Conexión a Supabase Storage confirmada.',
            fileName: key,
            location: fileUrl,
            bucket: BUCKET_NAME
        });

    } catch (error: any) {
        console.error('❌ Error al intentar subir a S3:', error.message);
        res.status(500).json({
            success: false,
            message: '❌ FALLO CRÍTICO: No se pudo conectar/autenticar con Supabase Storage.',
            error: error.message,
            solucion: 'Revisa las variables AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY y S3_ENDPOINT.'
        });
    }
};