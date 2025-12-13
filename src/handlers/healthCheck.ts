// src/handlers/healthCheck.ts

import { Request, Response } from 'express';
import { Pool } from 'pg'; // Asume que estás usando pg
// Importa tu cliente S3/AWS para Storage
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3"; 

// Se asume que tu conexión a la DB está inicializada globalmente o se importa
// Si usas un pool global, impórtalo aquí
// import { pool } from '../config/db.config'; 
// Usaremos la conexión directa para el chequeo

const getDbHealth = async (dbPool: Pool) => {
    try {
        await dbPool.query('SELECT 1'); // Consulta de conexión simple
        return { database: 'OK' };
    } catch (error) {
        console.error('Database connection failed:', error);
        return { database: 'ERROR', detail: error instanceof Error ? error.message : 'Unknown DB error' };
    }
};

const getStorageHealth = async () => {
    const bucketName = process.env.S3_BUCKET_NAME;
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.AWS_REGION;

    if (!endpoint || !bucketName) {
        return { storage: 'ERROR', detail: 'S3_ENDPOINT or S3_BUCKET_NAME is missing' };
    }

    try {
        const s3Client = new S3Client({
            region: region,
            endpoint: endpoint,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
            forcePathStyle: true, // Necesario para compatibilidad con Supabase S3
        });
        
        // Intenta listar buckets para verificar la autenticación y la conexión
        const command = new ListBucketsCommand({});
        await s3Client.send(command);
        
        return { storage: 'OK' };
    } catch (error) {
        console.error('Storage connection failed:', error);
        return { storage: 'ERROR', detail: error instanceof Error ? error.message : 'Unknown S3 error' };
    }
};


export const healthCheck = async (req: Request, res: Response) => {
    const dbPool = new Pool({ connectionString: process.env.DATABASE_URL }); // Conexión temporal, idealmente usarías un pool global
    
    // Ejecutar chequeos en paralelo
    const [dbStatus, storageStatus] = await Promise.all([
        getDbHealth(dbPool),
        getStorageHealth(),
    ]);

    // Calcular el estado general
    const overallStatus = (dbStatus.database === 'OK' && storageStatus.storage === 'OK') ? 200 : 503;

    await dbPool.end(); // Cerrar la conexión temporal

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
};