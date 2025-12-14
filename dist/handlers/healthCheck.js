"use strict";
// src/handlers/healthCheck.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = void 0;
const pg_1 = require("pg"); // Asume que estás usando pg
// Importa tu cliente S3/AWS para Storage
const client_s3_1 = require("@aws-sdk/client-s3");
// Se asume que tu conexión a la DB está inicializada globalmente o se importa
// Si usas un pool global, impórtalo aquí
// import { pool } from '../config/db.config'; 
// Usaremos la conexión directa para el chequeo
const getDbHealth = (dbPool) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield dbPool.query('SELECT 1'); // Consulta de conexión simple
        return { database: 'OK' };
    }
    catch (error) {
        console.error('Database connection failed:', error);
        return { database: 'ERROR', detail: error instanceof Error ? error.message : 'Unknown DB error' };
    }
});
const getStorageHealth = () => __awaiter(void 0, void 0, void 0, function* () {
    const bucketName = process.env.S3_BUCKET_NAME;
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.AWS_REGION;
    if (!endpoint || !bucketName) {
        return { storage: 'ERROR', detail: 'S3_ENDPOINT or S3_BUCKET_NAME is missing' };
    }
    try {
        const s3Client = new client_s3_1.S3Client({
            region: region,
            endpoint: endpoint,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
            forcePathStyle: true, // Necesario para compatibilidad con Supabase S3
        });
        // Intenta listar buckets para verificar la autenticación y la conexión
        const command = new client_s3_1.ListBucketsCommand({});
        yield s3Client.send(command);
        return { storage: 'OK' };
    }
    catch (error) {
        console.error('Storage connection failed:', error);
        return { storage: 'ERROR', detail: error instanceof Error ? error.message : 'Unknown S3 error' };
    }
});
const healthCheck = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const dbPool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL }); // Conexión temporal, idealmente usarías un pool global
    // Ejecutar chequeos en paralelo
    const [dbStatus, storageStatus] = yield Promise.all([
        getDbHealth(dbPool),
        getStorageHealth(),
    ]);
    // Calcular el estado general
    const overallStatus = (dbStatus.database === 'OK' && storageStatus.storage === 'OK') ? 200 : 503;
    yield dbPool.end(); // Cerrar la conexión temporal
    res.status(overallStatus).json({
        uptime: process.uptime(),
        message: 'PetSitter Backend Operational',
        timestamp: new Date().toISOString(),
        overall: overallStatus === 200 ? 'OK' : 'DEGRADED',
        checks: {
            database: dbStatus,
            storage: storageStatus,
            // (Futuro) auth_keys: JWT_SECRET check
        }
    });
});
exports.healthCheck = healthCheck;
