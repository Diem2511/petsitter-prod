"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testS3Connection = exports.uploadTest = exports.uploadMiddleware = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const multer_1 = __importDefault(require("multer"));
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
const s3Client = new client_s3_1.S3Client(s3ClientConfig);
const BUCKET_NAME = process.env.BUCKET_NAME || 'petsitter-evidence';
// --- Middleware para manejar archivos (Multer) ---
const storage = multer_1.default.memoryStorage();
exports.uploadMiddleware = (0, multer_1.default)({ storage: storage });
// ------------------------------------------------------------------
// HANDLER 1: Subida de Prueba (POST /api/test-upload)
// ------------------------------------------------------------------
const uploadTest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        ACL: 'public-read',
    };
    try {
        const command = new client_s3_1.PutObjectCommand(uploadParams);
        yield s3Client.send(command);
        const fileUrl = `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${key}`;
        res.json({
            success: true,
            message: '✅ Conexión a Supabase Storage confirmada.',
            fileName: key,
            location: fileUrl,
            bucket: BUCKET_NAME
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: '❌ FALLO CRÍTICO: No se pudo conectar/autenticar con Supabase Storage.',
            error: error.message,
            solucion: 'Revisa las variables AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_ENDPOINT y BUCKET_NAME.'
        });
    }
});
exports.uploadTest = uploadTest;
// ------------------------------------------------------------------
// HANDLER 2: Prueba de Conexión de un clic (GET /api/test-s3)
// ------------------------------------------------------------------
const testS3Connection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Ejecutamos un comando simple (ListBuckets) para probar las credenciales
        const result = yield s3Client.send(new client_s3_1.ListBucketsCommand({}));
        res.json({
            success: true,
            message: '✅ Credenciales y Conexión S3/Storage confirmadas.',
            bucketsFound: ((_a = result.Buckets) === null || _a === void 0 ? void 0 : _a.length) || 0,
            status: 'Credentials OK'
        });
    }
    catch (error) {
        console.error('❌ Error S3:', error.message);
        res.status(500).json({
            success: false,
            message: '❌ FALLO CRÍTICO: No se pudo autenticar con Supabase Storage.',
            error: error.message,
            solucion: 'Revisa las variables AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY y S3_ENDPOINT.'
        });
    }
});
exports.testS3Connection = testS3Connection;
