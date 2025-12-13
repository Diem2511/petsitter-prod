// src/index.ts (Fragmento de código)

import express from 'express';
// Asegúrate de importar el nuevo handler
import { healthCheck } from './handlers/healthCheck'; 
// ... otras importaciones

const app = express();
// ... otros middlewares

// ===================================
// AÑADE ESTA LÍNEA CON LAS DEMÁS RUTAS
// ===================================
app.get('/api/health', healthCheck); 
// ===================================

// ... (resto de tus rutas y app.listen)