"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const url_1 = require("url");
dotenv.config();
console.log('🚀 Inicializando PostgreSQL (Configuración Desglosada IPv4)...');
let config = {
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
};
if (process.env.DATABASE_URL) {
    try {
        // Parseamos la URL nosotros mismos
        // Esto ignora si la variable tiene basura, extraemos lo útil
        // Si Render tiene una IP en la URL, la ignoramos y forzamos el host real
        const parser = new url_1.URL(process.env.DATABASE_URL);
        config.user = parser.username;
        config.password = parser.password;
        config.host = 'db.qzgdviycwxzmvwtazkis.supabase.co'; // <--- HARDCODED PARA ASEGURARNOS
        config.port = 5432;
        config.database = 'postgres';
    }
    catch (e) {
        console.error('Error parseando URL, usando fallback string');
        config.connectionString = process.env.DATABASE_URL;
    }
}
const pool = new pg_1.Pool(config);
pool.query('SELECT NOW()')
    .then(() => console.log('✅ CONEXIÓN EXITOSA'))
    .catch(err => console.error('❌ Error:', err.message));
exports.default = pool;
